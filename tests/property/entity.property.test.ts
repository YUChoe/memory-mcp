/**
 * 엔티티 관련 속성 기반 테스트
 * Feature: knowledge-graph-mcp-server
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { KnowledgeGraphManager } from '../../src/knowledge-graph-manager.js';
import { GraphStorage } from '../../src/graph-storage.js';
import { EntityInput } from '../../src/types.js';
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
// 속성 1: 엔티티 생성 및 조회
// **Validates: Requirements 1.1, 1.2**
// ============================================================================

describe('Property 1: 엔티티 생성 및 조회', () => {
  it('모든 유효한 엔티티 입력에 대해, 엔티티를 생성한 후 이름으로 조회하면 동일한 정보가 반환되어야 함', async () => {
    await fc.assert(
      fc.asyncProperty(entityInputArb, async (input) => {
        const testDir = await createTestDir();

        try {
          const storage = new GraphStorage(testDir);
          const manager = new KnowledgeGraphManager(storage);
          await manager.loadFromStorage();

          // 엔티티 생성
          const createResult = await manager.createEntities([input]);
          expect(createResult.success).toBe(true);

          if (!createResult.success) {
            return;
          }

          // 생성된 엔티티 확인
          const created = createResult.data[0];
          expect(created.name).toBe(input.name);
          expect(created.entityType).toBe(input.entityType);
          expect(created.observations).toEqual(input.observations);

          // 이름으로 조회
          const openResult = manager.openNodes([input.name]);
          expect(openResult.success).toBe(true);

          if (!openResult.success) {
            return;
          }

          // 조회된 엔티티 확인
          const opened = openResult.data[0];
          expect(opened.name).toBe(input.name);
          expect(opened.entityType).toBe(input.entityType);
          expect(opened.observations).toEqual(input.observations);
        } finally {
          await cleanupTestDir(testDir);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('여러 엔티티를 생성한 후 모두 조회할 수 있어야 함', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(entityInputArb, { minLength: 1, maxLength: 10 }).chain(inputs => {
          // 중복 이름 제거
          const uniqueInputs = Array.from(
            new Map(inputs.map(i => [i.name, i])).values()
          );
          return fc.constant(uniqueInputs);
        }),
        async (inputs) => {
          const testDir = await createTestDir();

          try {
            const storage = new GraphStorage(testDir);
            const manager = new KnowledgeGraphManager(storage);
            await manager.loadFromStorage();

            // 모든 엔티티 생성
            const createResult = await manager.createEntities(inputs);
            expect(createResult.success).toBe(true);

            if (!createResult.success) {
              return;
            }

            // 모든 엔티티 조회
            const names = inputs.map(i => i.name);
            const openResult = manager.openNodes(names);
            expect(openResult.success).toBe(true);

            if (!openResult.success) {
              return;
            }

            // 조회된 엔티티 수 확인
            expect(openResult.data.length).toBe(inputs.length);

            // 각 엔티티 확인
            for (const input of inputs) {
              const found = openResult.data.find(e => e.name === input.name);
              expect(found).toBeDefined();
              expect(found?.entityType).toBe(input.entityType);
              expect(found?.observations).toEqual(input.observations);
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
