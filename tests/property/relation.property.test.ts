/**
 * 관계 관련 속성 기반 테스트
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

let testDir: string;

beforeEach(async () => {
  testDir = path.join(os.tmpdir(), `kg-test-${Date.now()}-${Math.random()}`);
  await fs.mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    // 정리 실패는 무시
  }
});

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
// 속성 4: 관계 생성 및 조회
// **Validates: Requirements 2.1**
// ============================================================================

describe('Property 4: 관계 생성 및 조회', () => {
  it('두 개의 존재하는 엔티티와 관계 타입에 대해, 관계를 생성한 후 그래프를 읽으면 해당 관계가 포함되어야 함', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(entityInputArb, { minLength: 2, maxLength: 5 }).chain(inputs => {
          const uniqueInputs = Array.from(
            new Map(inputs.map(i => [i.name, i])).values()
          );
          return fc.constant(uniqueInputs);
        }),
        relationTypeArb,
        async (inputs, relationType) => {
          if (inputs.length < 2) {
            return;
          }

          const uniqueTestDir = path.join(os.tmpdir(), `kg-test-${Date.now()}-${Math.random()}`);
          await fs.mkdir(uniqueTestDir, { recursive: true });

          const storage = new GraphStorage(uniqueTestDir);
          const manager = new KnowledgeGraphManager(storage);
          await manager.loadFromStorage();

          // 엔티티 생성
          const createResult = await manager.createEntities(inputs);
          expect(createResult.success).toBe(true);

          if (!createResult.success) {
            return;
          }

          // 관계 생성
          const relation: RelationInput = {
            from: inputs[0].name,
            to: inputs[1].name,
            relationType: relationType,
          };

          const relResult = await manager.createRelations([relation]);
          expect(relResult.success).toBe(true);

          if (!relResult.success) {
            return;
          }

          // 그래프 읽기
          const graphResult = manager.readGraph();
          expect(graphResult.success).toBe(true);

          if (!graphResult.success) {
            return;
          }

          // 관계가 포함되어 있는지 확인
          const foundRelation = graphResult.data.relations.find(
            r => r.from === relation.from &&
                 r.to === relation.to &&
                 r.relationType === relation.relationType
          );

          expect(foundRelation).toBeDefined();
          expect(foundRelation?.from).toBe(relation.from);
          expect(foundRelation?.to).toBe(relation.to);
          expect(foundRelation?.relationType).toBe(relation.relationType);

          // 정리
          await fs.rm(uniqueTestDir, { recursive: true, force: true });
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================================================
// 속성 5: 관계는 존재하는 엔티티 필요
// **Validates: Requirements 2.2**
// ============================================================================

describe('Property 5: 관계는 존재하는 엔티티 필요', () => {
  it('존재하지 않는 엔티티 이름을 포함하는 관계 입력에 대해, 관계 생성을 시도하면 에러가 반환되고 그래프는 변경되지 않아야 함', async () => {
    await fc.assert(
      fc.asyncProperty(
        entityInputArb,
        entityNameArb,
        relationTypeArb,
        async (existingEntity, nonExistentName, relationType) => {
          // 존재하는 엔티티와 다른 이름 보장
          if (existingEntity.name === nonExistentName) {
            return;
          }

          const uniqueTestDir = path.join(os.tmpdir(), `kg-test-${Date.now()}-${Math.random()}`);
          await fs.mkdir(uniqueTestDir, { recursive: true });

          const storage = new GraphStorage(uniqueTestDir);
          const manager = new KnowledgeGraphManager(storage);
          await manager.loadFromStorage();

          // 하나의 엔티티만 생성
          const createResult = await manager.createEntities([existingEntity]);
          expect(createResult.success).toBe(true);

          if (!createResult.success) {
            return;
          }

          // 그래프 상태 저장
          const beforeRelation = manager.readGraph();
          expect(beforeRelation.success).toBe(true);

          if (!beforeRelation.success) {
            return;
          }

          const relationCountBefore = beforeRelation.data.relations.length;

          // 존재하지 않는 엔티티로 관계 생성 시도
          const invalidRelation: RelationInput = {
            from: existingEntity.name,
            to: nonExistentName,
            relationType: relationType,
          };

          const relResult = await manager.createRelations([invalidRelation]);

          // 에러가 반환되어야 함
          expect(relResult.success).toBe(false);

          if (relResult.success) {
            return;
          }

          // 에러 메시지에 존재하지 않는 엔티티 이름이 포함되어야 함
          expect(relResult.error).toContain(nonExistentName);

          // 그래프가 변경되지 않았는지 확인
          const afterRelation = manager.readGraph();
          expect(afterRelation.success).toBe(true);

          if (!afterRelation.success) {
            return;
          }

          const relationCountAfter = afterRelation.data.relations.length;
          expect(relationCountAfter).toBe(relationCountBefore);

          // 정리
          await fs.rm(uniqueTestDir, { recursive: true, force: true });
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================================================
// 속성 6: 관계 삭제는 선택적
// **Validates: Requirements 2.3**
// ============================================================================

describe('Property 6: 관계 삭제는 선택적', () => {
  it('여러 관계가 있을 때, 특정 관계를 삭제하면 해당 관계만 제거되고 다른 관계는 유지되어야 함', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(entityInputArb, { minLength: 3, maxLength: 5 }).chain(inputs => {
          const uniqueInputs = Array.from(
            new Map(inputs.map(i => [i.name, i])).values()
          );
          return fc.constant(uniqueInputs);
        }),
        async (inputs) => {
          if (inputs.length < 3) {
            return;
          }

          const uniqueTestDir = path.join(os.tmpdir(), `kg-test-${Date.now()}-${Math.random()}`);
          await fs.mkdir(uniqueTestDir, { recursive: true });

          const storage = new GraphStorage(uniqueTestDir);
          const manager = new KnowledgeGraphManager(storage);
          await manager.loadFromStorage();

          // 엔티티 생성
          const createResult = await manager.createEntities(inputs);
          expect(createResult.success).toBe(true);

          if (!createResult.success) {
            return;
          }

          // 여러 관계 생성
          const relations: RelationInput[] = [
            {
              from: inputs[0].name,
              to: inputs[1].name,
              relationType: 'relates_to',
            },
            {
              from: inputs[1].name,
              to: inputs[2].name,
              relationType: 'connects_to',
            },
          ];

          const relResult = await manager.createRelations(relations);
          expect(relResult.success).toBe(true);

          if (!relResult.success) {
            return;
          }

          // 그래프 읽기 - 관계 확인
          const beforeDelete = manager.readGraph();
          expect(beforeDelete.success).toBe(true);

          if (!beforeDelete.success) {
            return;
          }

          expect(beforeDelete.data.relations.length).toBe(2);

          // 첫 번째 관계만 삭제
          const deleteResult = await manager.deleteRelations([relations[0]]);
          expect(deleteResult.success).toBe(true);

          // 그래프 읽기 - 선택적 삭제 확인
          const afterDelete = manager.readGraph();
          expect(afterDelete.success).toBe(true);

          if (!afterDelete.success) {
            return;
          }

          // 하나의 관계만 남아있어야 함
          expect(afterDelete.data.relations.length).toBe(1);

          // 삭제된 관계가 없는지 확인
          const deletedRelation = afterDelete.data.relations.find(
            r => r.from === relations[0].from &&
                 r.to === relations[0].to &&
                 r.relationType === relations[0].relationType
          );
          expect(deletedRelation).toBeUndefined();

          // 남은 관계가 두 번째 관계인지 확인
          const remainingRelation = afterDelete.data.relations.find(
            r => r.from === relations[1].from &&
                 r.to === relations[1].to &&
                 r.relationType === relations[1].relationType
          );
          expect(remainingRelation).toBeDefined();

          // 정리
          await fs.rm(uniqueTestDir, { recursive: true, force: true });
        }
      ),
      { numRuns: 50 }
    );
  });
});
