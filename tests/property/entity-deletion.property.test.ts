/**
 * 엔티티 삭제 관련 속성 기반 테스트
 * Feature: knowledge-graph-mcp-server
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { KnowledgeGraphManager } from '../../src/knowledge-graph-manager.js';
import { GraphStorage } from '../../src/graph-storage.js';
import { EntityInput, RelationInput } from '../../src/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// 테스트 설정
// ============================================================================

/**
 * 고유한 테스트 디렉토리 생성
 */
async function createTestDir(): Promise<string> {
  const testDir = path.join(os.tmpdir(), `kg-test-${Date.now()}-${Math.random()}`);
  await fs.mkdir(testDir, { recursive: true });
  return testDir;
}

/**
 * 테스트 디렉토리 정리
 */
async function cleanupTestDir(testDir: string): Promise<void> {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    // 정리 실패는 무시
  }
}

// ============================================================================
// Arbitraries (테스트 데이터 생성기)
// ============================================================================

const entityNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const entityTypeArb = fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0);
const observationArb = fc.string({ minLength: 1, maxLength: 100 });
const relationTypeArb = fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0);

const entityInputArb: fc.Arbitrary<EntityInput> = fc.record({
  name: entityNameArb,
  entityType: entityTypeArb,
  observations: fc.array(observationArb, { minLength: 0, maxLength: 5 }),
});

// ============================================================================
// 속성 2: 엔티티 삭제 시 관계 연쇄 삭제
// **Validates: Requirements 1.3, 1.5, 2.4**
// ============================================================================

describe('Property 2: 엔티티 삭제 시 관계 연쇄 삭제', () => {
  it('엔티티를 삭제하면 해당 엔티티와 모든 관련 관계가 그래프에서 제거되어야 함', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(entityInputArb, { minLength: 3, maxLength: 5 }).chain(inputs => {
          const uniqueInputs = Array.from(
            new Map(inputs.map(i => [i.name, i])).values()
          );
          return fc.constant(uniqueInputs);
        }),
        async (inputs) => {
          const testDir = await createTestDir();

          try {
            // 새로운 매니저 인스턴스 생성
            const testStorage = new GraphStorage(testDir);
            const testManager = new KnowledgeGraphManager(testStorage);
            await testManager.loadFromStorage();

            // 엔티티 생성
            const createResult = await testManager.createEntities(inputs);
            expect(createResult.success).toBe(true);

            if (!createResult.success || inputs.length < 2) {
              return;
            }

            // 관계 생성 (첫 번째 엔티티를 중심으로)
            const targetEntity = inputs[0].name;
            const relations: RelationInput[] = inputs.slice(1).map(input => ({
              from: targetEntity,
              to: input.name,
              relationType: 'relates_to',
            }));

            const relResult = await testManager.createRelations(relations);
            expect(relResult.success).toBe(true);

            if (!relResult.success) {
              return;
            }

            // 그래프 읽기 - 관계 확인
            const beforeDelete = testManager.readGraph();
            expect(beforeDelete.success).toBe(true);

            if (!beforeDelete.success) {
              return;
            }

            const relationCountBefore = beforeDelete.data.relations.length;
            expect(relationCountBefore).toBe(relations.length);

            // 엔티티 삭제
            const deleteResult = await testManager.deleteEntities([targetEntity]);
            expect(deleteResult.success).toBe(true);

            // 그래프 읽기 - 엔티티와 관계 모두 삭제되었는지 확인
            const afterDelete = testManager.readGraph();
            expect(afterDelete.success).toBe(true);

            if (!afterDelete.success) {
              return;
            }

            // 엔티티가 삭제되었는지 확인
            const entityExists = afterDelete.data.entities.has(targetEntity);
            expect(entityExists).toBe(false);

            // 관련 관계가 모두 삭제되었는지 확인
            const remainingRelations = afterDelete.data.relations.filter(
              r => r.from === targetEntity || r.to === targetEntity
            );
            expect(remainingRelations.length).toBe(0);
          } finally {
            await cleanupTestDir(testDir);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================================================
// 속성 3: 중복 엔티티 이름 거부
// **Validates: Requirements 1.5**
// ============================================================================

describe('Property 3: 중복 엔티티 이름 거부', () => {
  it('이미 존재하는 엔티티 이름으로 새 엔티티를 생성하려고 하면 에러가 반환되고 그래프는 변경되지 않아야 함', async () => {
    await fc.assert(
      fc.asyncProperty(
        entityInputArb,
        entityTypeArb,
        fc.array(observationArb, { minLength: 0, maxLength: 3 }),
        async (firstEntity, newType, newObservations) => {
          const testDir = await createTestDir();

          try {
            // 새로운 매니저 인스턴스 생성
            const testStorage = new GraphStorage(testDir);
            const testManager = new KnowledgeGraphManager(testStorage);
            await testManager.loadFromStorage();

            // 첫 번째 엔티티 생성
            const firstResult = await testManager.createEntities([firstEntity]);
            expect(firstResult.success).toBe(true);

            if (!firstResult.success) {
              return;
            }

            // 그래프 상태 저장
            const beforeDuplicate = testManager.readGraph();
            expect(beforeDuplicate.success).toBe(true);

            if (!beforeDuplicate.success) {
              return;
            }

            const entityCountBefore = beforeDuplicate.data.entities.size;

            // 동일한 이름으로 다른 엔티티 생성 시도
            const duplicateEntity: EntityInput = {
              name: firstEntity.name,
              entityType: newType,
              observations: newObservations,
            };

            const duplicateResult = await testManager.createEntities([duplicateEntity]);

            // 에러가 반환되어야 함
            expect(duplicateResult.success).toBe(false);

            if (duplicateResult.success) {
              return;
            }

            // 에러 메시지에 엔티티 이름이 포함되어야 함
            expect(duplicateResult.error).toContain(firstEntity.name);

            // 그래프가 변경되지 않았는지 확인
            const afterDuplicate = testManager.readGraph();
            expect(afterDuplicate.success).toBe(true);

            if (!afterDuplicate.success) {
              return;
            }

            const entityCountAfter = afterDuplicate.data.entities.size;
            expect(entityCountAfter).toBe(entityCountBefore);

            // 원래 엔티티가 그대로 유지되는지 확인
            const originalEntity = afterDuplicate.data.entities.get(firstEntity.name);
            expect(originalEntity).toBeDefined();
            expect(originalEntity?.entityType).toBe(firstEntity.entityType);
            expect(originalEntity?.observations).toEqual(firstEntity.observations);
          } finally {
            await cleanupTestDir(testDir);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
