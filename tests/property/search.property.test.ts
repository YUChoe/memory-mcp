/**
 * 검색 및 조회 관련 속성 기반 테스트
 * Feature: knowledge-graph-mcp-server
 */

import { describe, it, expect } from 'vitest';
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

/**
 * 관계 타입 생성
 */
const relationTypeArb = fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0);

// ============================================================================
// 속성 10: 그래프 읽기는 모든 데이터 반환
// **Validates: Requirements 4.1**
// ============================================================================

describe('Property 10: 그래프 읽기는 모든 데이터 반환', () => {
  it('모든 그래프 상태에 대해, 그래프를 읽으면 모든 엔티티와 모든 관계가 반환되어야 함', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(entityInputArb, { minLength: 1, maxLength: 10 }).chain(inputs => {
          // 중복 이름 제거
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

            // 엔티티 생성
            const createResult = await manager.createEntities(entityInputs);
            expect(createResult.success).toBe(true);

            if (!createResult.success) {
              return;
            }

            // 관계 생성 (가능한 경우)
            const relations: RelationInput[] = [];
            if (entityInputs.length >= 2) {
              relations.push({
                from: entityInputs[0].name,
                to: entityInputs[1].name,
                relationType: 'relates_to',
              });
              await manager.createRelations(relations);
            }

            // 그래프 읽기
            const readResult = manager.readGraph();
            expect(readResult.success).toBe(true);

            if (!readResult.success) {
              return;
            }

            const graph = readResult.data;

            // 모든 엔티티가 반환되는지 확인
            expect(graph.entities.size).toBe(entityInputs.length);
            for (const input of entityInputs) {
              const entity = graph.entities.get(input.name);
              expect(entity).toBeDefined();
              expect(entity?.name).toBe(input.name);
              expect(entity?.entityType).toBe(input.entityType);
              expect(entity?.observations).toEqual(input.observations);
            }

            // 모든 관계가 반환되는지 확인
            expect(graph.relations.length).toBe(relations.length);
            for (const relation of relations) {
              const found = graph.relations.find(
                r => r.from === relation.from && r.to === relation.to && r.relationType === relation.relationType
              );
              expect(found).toBeDefined();
            }
          } finally {
            await cleanupTestDir(testDir);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('빈 그래프를 읽으면 빈 엔티티와 관계 목록이 반환되어야 함', async () => {
    const testDir = await createTestDir();

    try {
      const storage = new GraphStorage(testDir);
      const manager = new KnowledgeGraphManager(storage);
      await manager.loadFromStorage();

      const readResult = manager.readGraph();
      expect(readResult.success).toBe(true);

      if (!readResult.success) {
        return;
      }

      expect(readResult.data.entities.size).toBe(0);
      expect(readResult.data.relations.length).toBe(0);
    } finally {
      await cleanupTestDir(testDir);
    }
  });
});

// ============================================================================
// 속성 11: 검색은 일치하는 엔티티 반환
// **Validates: Requirements 4.2, 4.3**
// ============================================================================

describe('Property 11: 검색은 일치하는 엔티티 반환', () => {
  it('검색 결과의 모든 엔티티는 이름, 타입, 또는 관찰 내용에 쿼리 문자열을 포함해야 함', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(entityInputArb, { minLength: 1, maxLength: 10 }).chain(inputs => {
          const uniqueInputs = Array.from(
            new Map(inputs.map(i => [i.name, i])).values()
          );
          return fc.constant(uniqueInputs);
        }),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (entityInputs, query) => {
          const testDir = await createTestDir();

          try {
            const storage = new GraphStorage(testDir);
            const manager = new KnowledgeGraphManager(storage);
            await manager.loadFromStorage();

            // 엔티티 생성
            await manager.createEntities(entityInputs);

            // 검색 수행
            const searchResult = manager.searchNodes(query);
            expect(searchResult.success).toBe(true);

            if (!searchResult.success) {
              return;
            }

            const lowerQuery = query.toLowerCase();

            // 검색 결과의 모든 엔티티가 쿼리와 일치하는지 확인
            for (const entity of searchResult.data) {
              const matchesName = entity.name.toLowerCase().includes(lowerQuery);
              const matchesType = entity.entityType.toLowerCase().includes(lowerQuery);
              const matchesObservations = entity.observations.some(obs =>
                obs.toLowerCase().includes(lowerQuery)
              );

              expect(matchesName || matchesType || matchesObservations).toBe(true);
            }
          } finally {
            await cleanupTestDir(testDir);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('쿼리와 일치하는 모든 엔티티가 결과에 포함되어야 함', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        async (searchTerm) => {
          const testDir = await createTestDir();

          try {
            const storage = new GraphStorage(testDir);
            const manager = new KnowledgeGraphManager(storage);
            await manager.loadFromStorage();

            // 검색어를 포함하는 엔티티와 포함하지 않는 엔티티 생성
            const matchingEntities: EntityInput[] = [
              {
                name: `entity_with_${searchTerm}_in_name`,
                entityType: 'type1',
                observations: [],
              },
              {
                name: 'entity2',
                entityType: `type_with_${searchTerm}`,
                observations: [],
              },
              {
                name: 'entity3',
                entityType: 'type3',
                observations: [`observation with ${searchTerm}`],
              },
            ];

            const nonMatchingEntities: EntityInput[] = [
              {
                name: 'other_entity',
                entityType: 'other_type',
                observations: ['other observation'],
              },
            ];

            await manager.createEntities([...matchingEntities, ...nonMatchingEntities]);

            // 검색 수행
            const searchResult = manager.searchNodes(searchTerm);
            expect(searchResult.success).toBe(true);

            if (!searchResult.success) {
              return;
            }

            // 일치하는 엔티티가 모두 포함되어야 함
            expect(searchResult.data.length).toBeGreaterThanOrEqual(matchingEntities.length);

            for (const matchingEntity of matchingEntities) {
              const found = searchResult.data.find(e => e.name === matchingEntity.name);
              expect(found).toBeDefined();
            }
          } finally {
            await cleanupTestDir(testDir);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('일치하는 엔티티가 없으면 빈 결과를 반환해야 함', async () => {
    const testDir = await createTestDir();

    try {
      const storage = new GraphStorage(testDir);
      const manager = new KnowledgeGraphManager(storage);
      await manager.loadFromStorage();

      // 엔티티 생성
      await manager.createEntities([
        {
          name: 'entity1',
          entityType: 'type1',
          observations: ['observation1'],
        },
      ]);

      // 일치하지 않는 검색어로 검색
      const searchResult = manager.searchNodes('nonexistent_search_term_xyz123');
      expect(searchResult.success).toBe(true);

      if (!searchResult.success) {
        return;
      }

      expect(searchResult.data.length).toBe(0);
    } finally {
      await cleanupTestDir(testDir);
    }
  });
});
