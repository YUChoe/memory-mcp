/**
 * 동시성 속성 테스트
 * Feature: knowledge-graph-mcp-server
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { KnowledgeGraphManager } from '../../src/knowledge-graph-manager.js';
import { GraphStorage } from '../../src/graph-storage.js';
import { EntityInput, RelationInput } from '../../src/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('동시성 속성 테스트', () => {
  let testDir: string;
  let storage: GraphStorage;
  let manager: KnowledgeGraphManager;

  beforeEach(async () => {
    // 테스트용 임시 디렉토리 생성
    testDir = path.join(os.tmpdir(), `kg-test-${Date.now()}-${Math.random()}`);
    await fs.mkdir(testDir, { recursive: true });

    storage = new GraphStorage(testDir);
    manager = new KnowledgeGraphManager(storage);
    await manager.loadFromStorage();
  });

  /**
   * 속성 16: 동시 작업은 일관성 유지
   *
   * 모든 동시에 실행되는 여러 작업에 대해, 모든 작업이 완료된 후
   * 그래프는 일관된 상태를 유지해야 합니다
   * (엔티티 없이 관계가 존재하지 않음, 중복 엔티티 없음).
   *
   * **Validates: Requirements 7.1, 7.2, 7.3**
   */
  it('속성 16: 동시 작업은 일관성 유지', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 엔티티 이름 생성기
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 5, maxLength: 15 }),
        async (entityNames) => {
          // 중복 제거
          const uniqueNames = [...new Set(entityNames)];
          if (uniqueNames.length < 3) return; // 최소 3개 필요

          // 새로운 매니저 인스턴스 생성
          const testStorage = new GraphStorage(testDir);
          const testManager = new KnowledgeGraphManager(testStorage);
          await testManager.loadFromStorage();

          // 엔티티 생성 작업들
          const createOps = uniqueNames.map((name, idx) => {
            const entity: EntityInput = {
              name,
              entityType: `Type${idx % 3}`,
              observations: [`obs-${idx}`],
            };
            return testManager.createEntities([entity]);
          });

          // 모든 생성 작업을 동시에 실행
          const createResults = await Promise.all(createOps);

          // 성공한 엔티티만 추출
          const createdNames = createResults
            .filter((r) => r.success)
            .flatMap((r) => (r.success ? r.data.map((e) => e.name) : []));

          // 관계 생성 작업들 (동시 실행)
          if (createdNames.length >= 2) {
            const relationOps: Promise<any>[] = [];
            for (let i = 0; i < Math.min(5, createdNames.length - 1); i++) {
              const relation: RelationInput = {
                from: createdNames[i],
                to: createdNames[i + 1],
                relationType: `relates_${i}`,
              };
              relationOps.push(testManager.createRelations([relation]));
            }

            await Promise.all(relationOps);
          }

          // 일부 엔티티 삭제 (동시 실행)
          const deleteCount = Math.min(2, Math.floor(createdNames.length / 2));
          const deleteOps = createdNames
            .slice(0, deleteCount)
            .map((name) => testManager.deleteEntities([name]));

          await Promise.all(deleteOps);

          // 최종 그래프 상태 확인
          const graphResult = testManager.readGraph();
          expect(graphResult.success).toBe(true);

          if (graphResult.success) {
            const graph = graphResult.data;

            // 일관성 검증 1: 중복 엔티티 없음
            const entityNamesInGraph = Array.from(graph.entities.keys());
            const uniqueEntityNames = new Set(entityNamesInGraph);
            expect(entityNamesInGraph.length).toBe(uniqueEntityNames.size);

            // 일관성 검증 2: 모든 관계는 존재하는 엔티티만 참조
            for (const relation of graph.relations) {
              expect(graph.entities.has(relation.from)).toBe(true);
              expect(graph.entities.has(relation.to)).toBe(true);
            }

            // 일관성 검증 3: 삭제된 엔티티는 그래프에 없음
            const deletedNames = createdNames.slice(0, deleteCount);
            for (const name of deletedNames) {
              expect(graph.entities.has(name)).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('동시 관찰 추가 작업의 일관성', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 5, maxLength: 20 }),
        async (entityName, observations) => {
          // 중복 제거
          const uniqueObservations = [...new Set(observations)];
          if (uniqueObservations.length < 2) return;

          // 새로운 매니저 인스턴스 생성
          const testStorage = new GraphStorage(testDir);
          const testManager = new KnowledgeGraphManager(testStorage);
          await testManager.loadFromStorage();

          // 엔티티 생성
          const createResult = await testManager.createEntities([
            {
              name: entityName,
              entityType: 'TestType',
              observations: [],
            },
          ]);

          if (!createResult.success) return;

          // 여러 관찰 추가 작업을 동시에 실행
          const addOps = uniqueObservations.map((obs) =>
            testManager.addObservations([
              {
                entityName,
                contents: [obs],
              },
            ])
          );

          await Promise.all(addOps);

          // 최종 상태 확인
          const openResult = testManager.openNodes([entityName]);
          expect(openResult.success).toBe(true);

          if (openResult.success) {
            const entity = openResult.data[0];
            // 모든 관찰이 추가되었는지 확인
            expect(entity.observations.length).toBe(uniqueObservations.length);

            // 각 관찰이 정확히 한 번씩만 존재하는지 확인
            for (const obs of uniqueObservations) {
              const count = entity.observations.filter((o) => o === obs).length;
              expect(count).toBe(1);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('동시 읽기 작업은 일관된 데이터 반환', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 3, maxLength: 10 }),
        async (entityNames) => {
          const uniqueNames = [...new Set(entityNames)];
          if (uniqueNames.length < 2) return;

          // 새로운 매니저 인스턴스 생성
          const testStorage = new GraphStorage(testDir);
          const testManager = new KnowledgeGraphManager(testStorage);
          await testManager.loadFromStorage();

          // 엔티티 생성
          const entities: EntityInput[] = uniqueNames.map((name) => ({
            name,
            entityType: 'TestType',
            observations: [`obs-${name}`],
          }));

          await testManager.createEntities(entities);

          // 여러 읽기 작업을 동시에 실행
          const readOps = Array(10)
            .fill(null)
            .map(() => testManager.readGraph());

          const results = await Promise.all(readOps);

          // 모든 읽기 결과가 성공
          for (const result of results) {
            expect(result.success).toBe(true);
          }

          // 모든 읽기 결과가 동일한 엔티티 수를 반환
          const entityCounts = results.map((r) =>
            r.success ? r.data.entities.size : 0
          );
          const firstCount = entityCounts[0];
          for (const count of entityCounts) {
            expect(count).toBe(firstCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
