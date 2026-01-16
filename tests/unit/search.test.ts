/**
 * 검색 기능 단위 테스트
 * 엣지 케이스 및 특수 시나리오 검증
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeGraphManager } from '../../src/knowledge-graph-manager.js';
import { GraphStorage } from '../../src/graph-storage.js';
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
// 검색 엣지 케이스 테스트
// ============================================================================

describe('검색 엣지 케이스', () => {
  describe('빈 검색 결과 처리', () => {
    it('빈 그래프에서 검색하면 빈 결과를 반환해야 함', async () => {
      const testDir = await createTestDir();

      try {
        const storage = new GraphStorage(testDir);
        const manager = new KnowledgeGraphManager(storage);
        await manager.loadFromStorage();

        const result = manager.searchNodes('anything');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual([]);
        }
      } finally {
        await cleanupTestDir(testDir);
      }
    });

    it('일치하는 엔티티가 없으면 빈 결과를 반환해야 함', async () => {
      const testDir = await createTestDir();

      try {
        const storage = new GraphStorage(testDir);
        const manager = new KnowledgeGraphManager(storage);
        await manager.loadFromStorage();

        await manager.createEntities([
          {
            name: 'entity1',
            entityType: 'type1',
            observations: ['observation1'],
          },
          {
            name: 'entity2',
            entityType: 'type2',
            observations: ['observation2'],
          },
        ]);

        const result = manager.searchNodes('nonexistent');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual([]);
        }
      } finally {
        await cleanupTestDir(testDir);
      }
    });

    it('빈 문자열로 검색하면 모든 엔티티를 반환해야 함', async () => {
      const testDir = await createTestDir();

      try {
        const storage = new GraphStorage(testDir);
        const manager = new KnowledgeGraphManager(storage);
        await manager.loadFromStorage();

        await manager.createEntities([
          {
            name: 'entity1',
            entityType: 'type1',
            observations: [],
          },
          {
            name: 'entity2',
            entityType: 'type2',
            observations: [],
          },
        ]);

        const result = manager.searchNodes('');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.length).toBe(2);
        }
      } finally {
        await cleanupTestDir(testDir);
      }
    });
  });

  describe('특수 문자 검색', () => {
    it('특수 문자를 포함한 이름을 검색할 수 있어야 함', async () => {
      const testDir = await createTestDir();

      try {
        const storage = new GraphStorage(testDir);
        const manager = new KnowledgeGraphManager(storage);
        await manager.loadFromStorage();

        const specialChars = ['@', '#', '$', '%', '&', '*', '(', ')', '-', '_', '+', '='];

        for (const char of specialChars) {
          await manager.createEntities([
            {
              name: `entity${char}name`,
              entityType: 'type',
              observations: [],
            },
          ]);

          const result = manager.searchNodes(char);

          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.length).toBeGreaterThan(0);
            expect(result.data.some(e => e.name.includes(char))).toBe(true);
          }
        }
      } finally {
        await cleanupTestDir(testDir);
      }
    });

    it('정규식 특수 문자를 리터럴로 검색해야 함', async () => {
      const testDir = await createTestDir();

      try {
        const storage = new GraphStorage(testDir);
        const manager = new KnowledgeGraphManager(storage);
        await manager.loadFromStorage();

        await manager.createEntities([
          {
            name: 'entity.name',
            entityType: 'type',
            observations: [],
          },
          {
            name: 'entity[name]',
            entityType: 'type',
            observations: [],
          },
          {
            name: 'entity*name',
            entityType: 'type',
            observations: [],
          },
        ]);

        // 점(.) 검색
        let result = manager.searchNodes('.');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.some(e => e.name === 'entity.name')).toBe(true);
        }

        // 대괄호([]) 검색
        result = manager.searchNodes('[');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.some(e => e.name === 'entity[name]')).toBe(true);
        }

        // 별표(*) 검색
        result = manager.searchNodes('*');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.some(e => e.name === 'entity*name')).toBe(true);
        }
      } finally {
        await cleanupTestDir(testDir);
      }
    });

    it('유니코드 문자를 검색할 수 있어야 함', async () => {
      const testDir = await createTestDir();

      try {
        const storage = new GraphStorage(testDir);
        const manager = new KnowledgeGraphManager(storage);
        await manager.loadFromStorage();

        await manager.createEntities([
          {
            name: '엔티티',
            entityType: '타입',
            observations: ['관찰내용'],
          },
          {
            name: 'entity',
            entityType: 'type',
            observations: ['observation'],
          },
        ]);

        // 한글 검색
        let result = manager.searchNodes('엔티티');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.length).toBe(1);
          expect(result.data[0].name).toBe('엔티티');
        }

        // 한글 타입 검색
        result = manager.searchNodes('타입');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.length).toBe(1);
          expect(result.data[0].entityType).toBe('타입');
        }

        // 한글 관찰 내용 검색
        result = manager.searchNodes('관찰');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.length).toBe(1);
          expect(result.data[0].observations).toContain('관찰내용');
        }
      } finally {
        await cleanupTestDir(testDir);
      }
    });

    it('공백을 포함한 검색어를 처리할 수 있어야 함', async () => {
      const testDir = await createTestDir();

      try {
        const storage = new GraphStorage(testDir);
        const manager = new KnowledgeGraphManager(storage);
        await manager.loadFromStorage();

        await manager.createEntities([
          {
            name: 'entity with spaces',
            entityType: 'type with spaces',
            observations: ['observation with spaces'],
          },
        ]);

        // 공백을 포함한 검색
        const result = manager.searchNodes('with spaces');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.length).toBe(1);
          expect(result.data[0].name).toBe('entity with spaces');
        }
      } finally {
        await cleanupTestDir(testDir);
      }
    });
  });

  describe('대소문자 구분 없는 검색', () => {
    it('대소문자를 구분하지 않고 검색해야 함', async () => {
      const testDir = await createTestDir();

      try {
        const storage = new GraphStorage(testDir);
        const manager = new KnowledgeGraphManager(storage);
        await manager.loadFromStorage();

        await manager.createEntities([
          {
            name: 'EntityName',
            entityType: 'TypeName',
            observations: ['ObservationContent'],
          },
        ]);

        // 소문자로 검색
        let result = manager.searchNodes('entityname');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.length).toBe(1);
        }

        // 대문자로 검색
        result = manager.searchNodes('TYPENAME');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.length).toBe(1);
        }

        // 혼합 대소문자로 검색
        result = manager.searchNodes('ObSeRvAtIoN');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.length).toBe(1);
        }
      } finally {
        await cleanupTestDir(testDir);
      }
    });
  });

  describe('부분 일치 검색', () => {
    it('부분 문자열로 검색할 수 있어야 함', async () => {
      const testDir = await createTestDir();

      try {
        const storage = new GraphStorage(testDir);
        const manager = new KnowledgeGraphManager(storage);
        await manager.loadFromStorage();

        await manager.createEntities([
          {
            name: 'prefix_entity_suffix',
            entityType: 'type',
            observations: [],
          },
        ]);

        // 접두사로 검색
        let result = manager.searchNodes('prefix');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.length).toBe(1);
        }

        // 중간 부분으로 검색
        result = manager.searchNodes('entity');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.length).toBe(1);
        }

        // 접미사로 검색
        result = manager.searchNodes('suffix');
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.length).toBe(1);
        }
      } finally {
        await cleanupTestDir(testDir);
      }
    });
  });
});

// ============================================================================
// 그래프 읽기 엣지 케이스 테스트
// ============================================================================

describe('그래프 읽기 엣지 케이스', () => {
  it('빈 그래프를 읽을 수 있어야 함', async () => {
    const testDir = await createTestDir();

    try {
      const storage = new GraphStorage(testDir);
      const manager = new KnowledgeGraphManager(storage);
      await manager.loadFromStorage();

      const result = manager.readGraph();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.entities.size).toBe(0);
        expect(result.data.relations.length).toBe(0);
      }
    } finally {
      await cleanupTestDir(testDir);
    }
  });

  it('엔티티만 있고 관계가 없는 그래프를 읽을 수 있어야 함', async () => {
    const testDir = await createTestDir();

    try {
      const storage = new GraphStorage(testDir);
      const manager = new KnowledgeGraphManager(storage);
      await manager.loadFromStorage();

      await manager.createEntities([
        {
          name: 'entity1',
          entityType: 'type1',
          observations: [],
        },
        {
          name: 'entity2',
          entityType: 'type2',
          observations: [],
        },
      ]);

      const result = manager.readGraph();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.entities.size).toBe(2);
        expect(result.data.relations.length).toBe(0);
      }
    } finally {
      await cleanupTestDir(testDir);
    }
  });

  it('읽은 그래프는 원본과 독립적이어야 함', async () => {
    const testDir = await createTestDir();

    try {
      const storage = new GraphStorage(testDir);
      const manager = new KnowledgeGraphManager(storage);
      await manager.loadFromStorage();

      await manager.createEntities([
        {
          name: 'entity1',
          entityType: 'type1',
          observations: ['obs1'],
        },
      ]);

      const result1 = manager.readGraph();
      expect(result1.success).toBe(true);

      if (!result1.success) {
        return;
      }

      // 그래프 수정
      await manager.createEntities([
        {
          name: 'entity2',
          entityType: 'type2',
          observations: [],
        },
      ]);

      const result2 = manager.readGraph();
      expect(result2.success).toBe(true);

      if (!result2.success) {
        return;
      }

      // 첫 번째 읽기 결과는 변경되지 않아야 함
      expect(result1.data.entities.size).toBe(1);
      expect(result2.data.entities.size).toBe(2);
    } finally {
      await cleanupTestDir(testDir);
    }
  });
});
