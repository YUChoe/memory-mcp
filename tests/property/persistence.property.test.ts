/**
 * 영속성 관련 속성 기반 테스트
 * Feature: knowledge-graph-mcp-server
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { GraphStorage } from '../../src/graph-storage.js';
import { KnowledgeGraph, Entity, Relation } from '../../src/types.js';

// ============================================================================
// Arbitraries (테스트 데이터 생성기)
// ============================================================================

/**
 * 유효한 엔티티 생성
 */
const entityArb: fc.Arbitrary<Entity> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  entityType: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  observations: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 0, maxLength: 5 }),
});

/**
 * 유효한 관계 생성
 */
const relationArb = (entityNames: string[]): fc.Arbitrary<Relation> => {
  if (entityNames.length < 2) {
    return fc.record({
      from: fc.constant(entityNames[0] || 'default'),
      to: fc.constant(entityNames[0] || 'default'),
      relationType: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
    });
  }

  return fc.record({
    from: fc.constantFrom(...entityNames),
    to: fc.constantFrom(...entityNames),
    relationType: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
  });
};

/**
 * 유효한 지식 그래프 생성
 */
const knowledgeGraphArb: fc.Arbitrary<KnowledgeGraph> = fc
  .array(entityArb, { minLength: 0, maxLength: 10 })
  .chain(entities => {
    // 중복 이름 제거
    const uniqueEntities = Array.from(
      new Map(entities.map(e => [e.name, e])).values()
    );

    const entityNames = uniqueEntities.map(e => e.name);

    if (entityNames.length === 0) {
      return fc.constant({
        entities: new Map(),
        relations: [],
      });
    }

    return fc.array(relationArb(entityNames), { minLength: 0, maxLength: 15 }).map(relations => ({
      entities: new Map(uniqueEntities.map(e => [e.name, e])),
      relations,
    }));
  });

// ============================================================================
// 테스트 설정
// ============================================================================

/**
 * 고유한 테스트 디렉토리 생성
 */
async function createTestDir(): Promise<string> {
  const testDir = path.join(os.tmpdir(), `kg-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
// 속성 12: 영속성 라운드 트립
// **Validates: Requirements 5.5**
// ============================================================================

describe('Property 12: 영속성 라운드 트립', () => {
  it('모든 유효한 그래프 상태에 대해, 그래프를 JSON으로 직렬화한 후 역직렬화하면 동일한 그래프가 생성되어야 함', async () => {
    await fc.assert(
      fc.asyncProperty(knowledgeGraphArb, async (graph) => {
        const testDir = await createTestDir();

        try {
          const storage = new GraphStorage(testDir);

          // 그래프 저장
          await storage.save(graph);

          // 그래프 로드
          const loaded = await storage.load();

          // 엔티티 비교
          expect(loaded.entities.size).toBe(graph.entities.size);

          for (const [name, entity] of graph.entities) {
            const loadedEntity = loaded.entities.get(name);
            expect(loadedEntity).toBeDefined();
            expect(loadedEntity?.name).toBe(entity.name);
            expect(loadedEntity?.entityType).toBe(entity.entityType);
            expect(loadedEntity?.observations).toEqual(entity.observations);
          }

          // 관계 비교
          expect(loaded.relations.length).toBe(graph.relations.length);

          for (let i = 0; i < graph.relations.length; i++) {
            expect(loaded.relations[i]).toEqual(graph.relations[i]);
          }
        } finally {
          await cleanupTestDir(testDir);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('빈 그래프도 올바르게 저장 및 로드되어야 함', async () => {
    const testDir = await createTestDir();

    try {
      const storage = new GraphStorage(testDir);
      const emptyGraph: KnowledgeGraph = {
        entities: new Map(),
        relations: [],
      };

      await storage.save(emptyGraph);
      const loaded = await storage.load();

      expect(loaded.entities.size).toBe(0);
      expect(loaded.relations.length).toBe(0);
    } finally {
      await cleanupTestDir(testDir);
    }
  });
});

// ============================================================================
// 속성 13: 데이터는 재시작 후에도 유지
// **Validates: Requirements 5.1, 5.2**
// ============================================================================

describe('Property 13: 데이터는 재시작 후에도 유지', () => {
  it('모든 그래프 수정 작업에 대해, 작업 수행 후 서버를 재시작하면 수정된 데이터가 유지되어야 함', async () => {
    await fc.assert(
      fc.asyncProperty(knowledgeGraphArb, async (initialGraph) => {
        const testDir = await createTestDir();

        try {
          // 첫 번째 저장소 인스턴스로 초기 그래프 저장
          const storage1 = new GraphStorage(testDir);
          await storage1.save(initialGraph);

          // 두 번째 저장소 인스턴스로 로드 (서버 재시작 시뮬레이션)
          const storage2 = new GraphStorage(testDir);
          const loaded = await storage2.load();

          // 데이터가 동일한지 확인
          expect(loaded.entities.size).toBe(initialGraph.entities.size);

          for (const [name, entity] of initialGraph.entities) {
            const loadedEntity = loaded.entities.get(name);
            expect(loadedEntity).toBeDefined();
            expect(loadedEntity?.name).toBe(entity.name);
            expect(loadedEntity?.entityType).toBe(entity.entityType);
            expect(loadedEntity?.observations).toEqual(entity.observations);
          }

          expect(loaded.relations.length).toBe(initialGraph.relations.length);

          for (let i = 0; i < initialGraph.relations.length; i++) {
            expect(loaded.relations[i]).toEqual(initialGraph.relations[i]);
          }
        } finally {
          await cleanupTestDir(testDir);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('여러 수정 작업 후 재시작해도 최종 상태가 유지되어야 함', async () => {
    const testDir = await createTestDir();

    try {
      // 첫 번째 인스턴스: 초기 데이터 저장
      const storage1 = new GraphStorage(testDir);
      const graph1: KnowledgeGraph = {
        entities: new Map([
          ['Entity1', { name: 'Entity1', entityType: 'Type1', observations: ['obs1'] }],
        ]),
        relations: [],
      };
      await storage1.save(graph1);

      // 두 번째 인스턴스: 데이터 수정
      const storage2 = new GraphStorage(testDir);
      const loaded1 = await storage2.load();
      loaded1.entities.set('Entity2', { name: 'Entity2', entityType: 'Type2', observations: ['obs2'] });
      loaded1.relations.push({ from: 'Entity1', to: 'Entity2', relationType: 'relates_to' });
      await storage2.save(loaded1);

      // 세 번째 인스턴스: 최종 상태 확인
      const storage3 = new GraphStorage(testDir);
      const loaded2 = await storage3.load();

      expect(loaded2.entities.size).toBe(2);
      expect(loaded2.entities.has('Entity1')).toBe(true);
      expect(loaded2.entities.has('Entity2')).toBe(true);
      expect(loaded2.relations.length).toBe(1);
      expect(loaded2.relations[0]).toEqual({ from: 'Entity1', to: 'Entity2', relationType: 'relates_to' });
    } finally {
      await cleanupTestDir(testDir);
    }
  });
});
