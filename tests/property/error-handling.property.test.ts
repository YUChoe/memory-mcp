/**
 * 에러 처리 속성 테스트
 * Feature: knowledge-graph-mcp-server
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { KnowledgeGraphManager } from '../../src/knowledge-graph-manager.js';
import { GraphStorage } from '../../src/graph-storage.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('에러 처리 속성 테스트', () => {
  let testDir: string;
  let storage: GraphStorage;
  let manager: KnowledgeGraphManager;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `kg-test-${Date.now()}-${Math.random()}`);
    await fs.mkdir(testDir, { recursive: true });
    storage = new GraphStorage(testDir);
    manager = new KnowledgeGraphManager(storage);
    await manager.loadFromStorage();
  });

  /**
   * 속성 14: 잘못된 파라미터는 에러 반환
   * **Validates: Requirements 6.4**
   *
   * 모든 MCP 도구와 잘못된 파라미터에 대해,
   * 도구를 호출하면 설명적인 에러 메시지가 반환되어야 합니다.
   */
  it('속성 14: 잘못된 파라미터는 에러 반환', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'createEntities',
          'createRelations',
          'addObservations',
          'deleteObservations'
        ),
        async (operation) => {
          let result;

          switch (operation) {
            case 'createEntities':
              // 빈 이름으로 엔티티 생성 시도
              result = await manager.createEntities([
                { name: '', entityType: 'test', observations: [] }
              ]);
              break;

            case 'createRelations':
              // 존재하지 않는 엔티티로 관계 생성 시도
              result = await manager.createRelations([
                { from: 'nonexistent1', to: 'nonexistent2', relationType: 'relates' }
              ]);
              break;

            case 'addObservations':
              // 존재하지 않는 엔티티에 관찰 추가 시도
              result = await manager.addObservations([
                { entityName: 'nonexistent', contents: ['test'] }
              ]);
              break;

            case 'deleteObservations':
              // 존재하지 않는 엔티티에서 관찰 삭제 시도
              result = await manager.deleteObservations([
                { entityName: 'nonexistent', observations: ['test'] }
              ]);
              break;
          }

          // 에러가 반환되어야 함
          expect(result.success).toBe(false);

          if (!result.success) {
            // 에러 메시지가 존재해야 함
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
            expect(result.error.length).toBeGreaterThan(0);

            // 한국어 설명도 존재해야 함
            expect(result.errorKo).toBeDefined();
            expect(typeof result.errorKo).toBe('string');
            expect(result.errorKo!.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 속성 15: 누락된 엔티티 에러는 이름 포함
   * **Validates: Requirements 8.2**
   *
   * 모든 존재하지 않는 엔티티 이름을 참조하는 작업에 대해,
   * 에러 메시지에 찾을 수 없는 엔티티 이름이 포함되어야 합니다.
   */
  it('속성 15: 누락된 엔티티 에러는 이름 포함', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        async (missingNames) => {
          // 고유한 이름만 사용
          const uniqueNames = [...new Set(missingNames)];

          // openNodes로 존재하지 않는 엔티티 조회
          const result = manager.openNodes(uniqueNames);

          // 에러가 반환되어야 함
          expect(result.success).toBe(false);

          if (!result.success) {
            // 에러 메시지에 모든 누락된 엔티티 이름이 포함되어야 함
            for (const name of uniqueNames) {
              expect(result.error).toContain(name);
            }

            // 한국어 에러 메시지에도 포함되어야 함
            expect(result.errorKo).toBeDefined();
            for (const name of uniqueNames) {
              expect(result.errorKo).toContain(name);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 속성 15-2: 관계 생성 시 누락된 엔티티 이름 포함
   * **Validates: Requirements 8.2**
   */
  it('속성 15-2: 관계 생성 시 누락된 엔티티 이름 포함', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (fromName, toName) => {
          // 관계 생성 시도 (엔티티가 존재하지 않음)
          const result = await manager.createRelations([
            { from: fromName, to: toName, relationType: 'relates' }
          ]);

          // 에러가 반환되어야 함
          expect(result.success).toBe(false);

          if (!result.success) {
            // 에러 메시지에 누락된 엔티티 이름이 포함되어야 함
            const errorContainsFrom = result.error.includes(fromName);
            const errorContainsTo = result.error.includes(toName);

            // 적어도 하나의 누락된 엔티티 이름이 포함되어야 함
            expect(errorContainsFrom || errorContainsTo).toBe(true);

            // 한국어 에러 메시지도 확인
            expect(result.errorKo).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 속성 15-3: 관찰 추가 시 누락된 엔티티 이름 포함
   * **Validates: Requirements 8.2**
   */
  it('속성 15-3: 관찰 추가 시 누락된 엔티티 이름 포함', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
        async (entityNames) => {
          const uniqueNames = [...new Set(entityNames)];

          // 관찰 추가 시도 (엔티티가 존재하지 않음)
          const result = await manager.addObservations(
            uniqueNames.map(name => ({
              entityName: name,
              contents: ['test observation']
            }))
          );

          // 에러가 반환되어야 함
          expect(result.success).toBe(false);

          if (!result.success) {
            // 에러 메시지에 모든 누락된 엔티티 이름이 포함되어야 함
            for (const name of uniqueNames) {
              expect(result.error).toContain(name);
            }

            // 한국어 에러 메시지도 확인
            expect(result.errorKo).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 속성 14-2: 중복 엔티티 생성 시 설명적 에러
   * **Validates: Requirements 6.4, 8.2**
   *
   * default_user는 upsert 방식이므로 제외
   */
  it('속성 14-2: 중복 엔티티 생성 시 설명적 에러', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 })
          .filter(s => s.trim().length > 0) // 공백만 있는 문자열 제외
          .filter(s => /^[a-zA-Z0-9_-]+$/.test(s.trim())) // 영숫자, _, - 만 허용
          .filter(s => s.trim() !== 'default_user') // default_user 제외
          .map(s => s.trim()), // trim된 값 사용
        fc.string({ minLength: 1, maxLength: 20 })
          .filter(s => s.trim().length > 0) // entityType도 공백 제외
          .map(s => s.trim()),
        async (name, entityType) => {
          // 각 테스트 실행마다 새로운 매니저 생성
          const testDir = path.join(os.tmpdir(), `kg-test-${Date.now()}-${Math.random()}`);
          await fs.mkdir(testDir, { recursive: true });
          const testStorage = new GraphStorage(testDir);
          const testManager = new KnowledgeGraphManager(testStorage);
          await testManager.loadFromStorage();

          // 첫 번째 엔티티 생성
          const result1 = await testManager.createEntities([
            { name, entityType, observations: [] }
          ]);
          expect(result1.success).toBe(true);

          // 동일한 이름으로 두 번째 엔티티 생성 시도
          const result2 = await testManager.createEntities([
            { name, entityType: 'different', observations: [] }
          ]);

          // 에러가 반환되어야 함
          expect(result2.success).toBe(false);

          if (!result2.success) {
            // 에러 메시지에 중복된 엔티티 이름이 포함되어야 함
            expect(result2.error).toContain(name);
            expect(result2.error.toLowerCase()).toContain('already exists');

            // 한국어 에러 메시지 확인
            expect(result2.errorKo).toBeDefined();
            expect(result2.errorKo).toContain(name);
            expect(result2.errorKo).toContain('이미 존재');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
