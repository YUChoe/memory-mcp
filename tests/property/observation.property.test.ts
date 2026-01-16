/**
 * 관찰 내용 관련 속성 기반 테스트
 * Feature: knowledge-graph-mcp-server
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { KnowledgeGraphManager } from '../../src/knowledge-graph-manager.js';
import { GraphStorage } from '../../src/graph-storage.js';
import { EntityInput, ObservationAddition, ObservationDeletion } from '../../src/types.js';
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

/**
 * 유효한 엔티티 이름 생성
 */
const entityNameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

/**
 * 유효한 엔티티 타입 생성
 */
const entityTypeArb = fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0);

/**
 * 관찰 내용 생성
 */
const observationArb = fc.string({ minLength: 1, maxLength: 100 });

/**
 * 엔티티 입력 생성
 */
const entityInputArb: fc.Arbitrary<EntityInput> = fc.record({
  name: entityNameArb,
  entityType: entityTypeArb,
  observations: fc.array(observationArb, { minLength: 0, maxLength: 5 }),
});

// ============================================================================
// 속성 7: 관찰 내용 추가
// **Validates: Requirements 3.1**
// ============================================================================

describe('Property 7: 관찰 내용 추가', () => {
  it('모든 존재하는 엔티티와 새로운 관찰 내용에 대해, 관찰 내용을 추가한 후 엔티티를 조회하면 기존 관찰 내용과 새 관찰 내용이 모두 포함되어야 함', async () => {
    await fc.assert(
      fc.asyncProperty(
        entityInputArb,
        fc.array(observationArb, { minLength: 1, maxLength: 5 }),
        async (entityInput, newObservations) => {
          const testDir = await createTestDir();

          try {
            const storage = new GraphStorage(testDir);
            const manager = new KnowledgeGraphManager(storage);
            await manager.loadFromStorage();

            // 엔티티 생성
            const createResult = await manager.createEntities([entityInput]);
            expect(createResult.success).toBe(true);

            if (!createResult.success) {
              return;
            }

            const originalObservations = [...entityInput.observations];

            // 관찰 내용 추가
            const addition: ObservationAddition = {
              entityName: entityInput.name,
              contents: newObservations,
            };

            const addResult = await manager.addObservations([addition]);
            expect(addResult.success).toBe(true);

            if (!addResult.success) {
              return;
            }

            // 엔티티 조회
            const openResult = manager.openNodes([entityInput.name]);
            expect(openResult.success).toBe(true);

            if (!openResult.success) {
              return;
            }

            const entity = openResult.data[0];

            // 기존 관찰 내용 확인
            for (const obs of originalObservations) {
              expect(entity.observations).toContain(obs);
            }

            // 새 관찰 내용 확인
            for (const obs of newObservations) {
              expect(entity.observations).toContain(obs);
            }

            // 전체 개수 확인
            expect(entity.observations.length).toBe(
              originalObservations.length + newObservations.length
            );
          } finally {
            await cleanupTestDir(testDir);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('여러 엔티티에 동시에 관찰 내용을 추가할 수 있어야 함', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(entityInputArb, { minLength: 2, maxLength: 5 }).chain(inputs => {
          const uniqueInputs = Array.from(
            new Map(inputs.map(i => [i.name, i])).values()
          );
          return fc.constant(uniqueInputs);
        }),
        async (entityInputs) => {
          const testDir = await createTestDir();

          try {
            const storage = new GraphStorage(testDir);
            const manager = new KnowledgeGraphManager(storage);
            await manager.loadFromStorage();

            // 모든 엔티티 생성
            const createResult = await manager.createEntities(entityInputs);
            expect(createResult.success).toBe(true);

            if (!createResult.success) {
              return;
            }

            // 각 엔티티에 관찰 내용 추가
            const additions: ObservationAddition[] = entityInputs.map(input => ({
              entityName: input.name,
              contents: ['새로운 관찰'],
            }));

            const addResult = await manager.addObservations(additions);
            expect(addResult.success).toBe(true);

            if (!addResult.success) {
              return;
            }

            // 모든 엔티티 확인
            for (const input of entityInputs) {
              const openResult = manager.openNodes([input.name]);
              expect(openResult.success).toBe(true);

              if (openResult.success) {
                const entity = openResult.data[0];
                expect(entity.observations).toContain('새로운 관찰');
              }
            }
          } finally {
            await cleanupTestDir(testDir);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// 속성 8: 관찰 내용 삭제는 선택적
// **Validates: Requirements 3.2**
// ============================================================================

describe('Property 8: 관찰 내용 삭제는 선택적', () => {
  it('모든 엔티티의 여러 관찰 내용 중 일부에 대해, 특정 관찰 내용을 삭제하면 해당 관찰만 제거되고 다른 관찰은 유지되어야 함', async () => {
    await fc.assert(
      fc.asyncProperty(
        entityInputArb.filter(input => input.observations.length >= 2),
        async (entityInput) => {
          const testDir = await createTestDir();

          try {
            const storage = new GraphStorage(testDir);
            const manager = new KnowledgeGraphManager(storage);
            await manager.loadFromStorage();

            // 엔티티 생성
            const createResult = await manager.createEntities([entityInput]);
            expect(createResult.success).toBe(true);

            if (!createResult.success) {
              return;
            }

            // 첫 번째 관찰 내용만 삭제
            const toDelete = [entityInput.observations[0]];
            const toKeep = entityInput.observations.slice(1);

            const deletion: ObservationDeletion = {
              entityName: entityInput.name,
              observations: toDelete,
            };

            const deleteResult = await manager.deleteObservations([deletion]);
            expect(deleteResult.success).toBe(true);

            if (!deleteResult.success) {
              return;
            }

            // 엔티티 조회
            const openResult = manager.openNodes([entityInput.name]);
            expect(openResult.success).toBe(true);

            if (!openResult.success) {
              return;
            }

            const entity = openResult.data[0];

            // 삭제된 관찰 내용은 없어야 함
            expect(entity.observations).not.toContain(toDelete[0]);

            // 유지되어야 할 관찰 내용은 있어야 함
            for (const obs of toKeep) {
              expect(entity.observations).toContain(obs);
            }

            // 개수 확인
            expect(entity.observations.length).toBe(toKeep.length);
          } finally {
            await cleanupTestDir(testDir);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('존재하지 않는 관찰 내용을 삭제해도 에러가 발생하지 않아야 함', async () => {
    await fc.assert(
      fc.asyncProperty(
        entityInputArb,
        observationArb,
        async (entityInput, nonExistentObs) => {
          const testDir = await createTestDir();

          try {
            const storage = new GraphStorage(testDir);
            const manager = new KnowledgeGraphManager(storage);
            await manager.loadFromStorage();

            // 엔티티 생성
            const createResult = await manager.createEntities([entityInput]);
            expect(createResult.success).toBe(true);

            if (!createResult.success) {
              return;
            }

            const originalObservations = [...entityInput.observations];

            // 존재하지 않는 관찰 내용 삭제 시도
            const deletion: ObservationDeletion = {
              entityName: entityInput.name,
              observations: [nonExistentObs],
            };

            const deleteResult = await manager.deleteObservations([deletion]);
            expect(deleteResult.success).toBe(true);

            if (!deleteResult.success) {
              return;
            }

            // 엔티티 조회
            const openResult = manager.openNodes([entityInput.name]);
            expect(openResult.success).toBe(true);

            if (!openResult.success) {
              return;
            }

            const entity = openResult.data[0];

            // 기존 관찰 내용은 그대로 유지되어야 함
            expect(entity.observations).toEqual(originalObservations);
          } finally {
            await cleanupTestDir(testDir);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// 속성 9: 관찰 내용은 존재하는 엔티티 필요
// **Validates: Requirements 3.3**
// ============================================================================

describe('Property 9: 관찰 내용은 존재하는 엔티티 필요', () => {
  it('모든 존재하지 않는 엔티티 이름에 대해, 해당 엔티티에 관찰 내용을 추가하려고 하면 에러가 반환되고 그래프는 변경되지 않아야 함', async () => {
    await fc.assert(
      fc.asyncProperty(
        entityNameArb,
        fc.array(observationArb, { minLength: 1, maxLength: 3 }),
        async (nonExistentName, observations) => {
          const testDir = await createTestDir();

          try {
            const storage = new GraphStorage(testDir);
            const manager = new KnowledgeGraphManager(storage);
            await manager.loadFromStorage();

            // 관찰 내용 추가 시도
            const addition: ObservationAddition = {
              entityName: nonExistentName,
              contents: observations,
            };

            const addResult = await manager.addObservations([addition]);

            // 에러가 반환되어야 함
            expect(addResult.success).toBe(false);

            if (!addResult.success) {
              expect(addResult.error).toContain(nonExistentName);
            }

            // 그래프가 비어있어야 함
            const graphResult = manager.readGraph();
            expect(graphResult.success).toBe(true);

            if (graphResult.success) {
              expect(graphResult.data.entities.size).toBe(0);
            }
          } finally {
            await cleanupTestDir(testDir);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('존재하지 않는 엔티티에서 관찰 내용을 삭제하려고 하면 에러가 반환되어야 함', async () => {
    await fc.assert(
      fc.asyncProperty(
        entityNameArb,
        fc.array(observationArb, { minLength: 1, maxLength: 3 }),
        async (nonExistentName, observations) => {
          const testDir = await createTestDir();

          try {
            const storage = new GraphStorage(testDir);
            const manager = new KnowledgeGraphManager(storage);
            await manager.loadFromStorage();

            // 관찰 내용 삭제 시도
            const deletion: ObservationDeletion = {
              entityName: nonExistentName,
              observations: observations,
            };

            const deleteResult = await manager.deleteObservations([deletion]);

            // 에러가 반환되어야 함
            expect(deleteResult.success).toBe(false);

            if (!deleteResult.success) {
              expect(deleteResult.error).toContain(nonExistentName);
            }
          } finally {
            await cleanupTestDir(testDir);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
