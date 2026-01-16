/**
 * 통합 테스트: MCP 프로토콜 준수
 *
 * 요구사항: 6.1, 6.2, 6.3, 6.4
 *
 * 이 테스트는 MCP 서버가 프로토콜 사양을 올바르게 구현하는지 검증합니다.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MCPServer } from '../../src/mcp-server.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('통합 테스트: MCP 프로토콜 준수', () => {
  let tempDir: string;
  let server: MCPServer;

  beforeEach(async () => {
    // 임시 디렉토리 생성
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kg-mcp-test-'));
    server = new MCPServer(tempDir);
  });

  afterEach(async () => {
    // 임시 디렉토리 정리
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // 정리 실패는 무시
    }
  });

  describe('도구 핸들러 테스트', () => {
    it('create_entities: 유효한 파라미터로 엔티티 생성', async () => {
      const handler = (server as any).handleCreateEntities.bind(server);

      const result = await handler({
        entities: [
          {
            name: 'TestEntity',
            entityType: 'TestType',
            observations: ['observation1'],
          },
        ],
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.isError).toBeUndefined();

      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data)).toBe(true);
      expect(data[0].name).toBe('TestEntity');
    });

    it('create_entities: 잘못된 파라미터는 에러 반환', async () => {
      const handler = (server as any).handleCreateEntities.bind(server);

      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid arguments');
    });

    it('create_relations: 유효한 파라미터로 관계 생성', async () => {
      // 먼저 엔티티 생성
      const createHandler = (server as any).handleCreateEntities.bind(server);
      await createHandler({
        entities: [
          { name: 'Entity1', entityType: 'Type1', observations: [] },
          { name: 'Entity2', entityType: 'Type2', observations: [] },
        ],
      });

      const handler = (server as any).handleCreateRelations.bind(server);
      const result = await handler({
        relations: [
          {
            from: 'Entity1',
            to: 'Entity2',
            relationType: 'relates_to',
          },
        ],
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data)).toBe(true);
    });

    it('create_relations: 존재하지 않는 엔티티는 에러 반환', async () => {
      const handler = (server as any).handleCreateRelations.bind(server);

      const result = await handler({
        relations: [
          {
            from: 'NonExistent1',
            to: 'NonExistent2',
            relationType: 'relates',
          },
        ],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
      expect(result.content[0].text).toContain('NonExistent');
    });

    it('add_observations: 유효한 파라미터로 관찰 추가', async () => {
      // 먼저 엔티티 생성
      const createHandler = (server as any).handleCreateEntities.bind(server);
      await createHandler({
        entities: [
          { name: 'Entity1', entityType: 'Type1', observations: ['obs1'] },
        ],
      });

      const handler = (server as any).handleAddObservations.bind(server);
      const result = await handler({
        observations: [
          {
            entityName: 'Entity1',
            contents: ['obs2', 'obs3'],
          },
        ],
      });

      expect(result.isError).toBeUndefined();
    });

    it('delete_entities: 엔티티 삭제', async () => {
      // 먼저 엔티티 생성
      const createHandler = (server as any).handleCreateEntities.bind(server);
      await createHandler({
        entities: [
          { name: 'ToDelete', entityType: 'Type1', observations: [] },
        ],
      });

      const handler = (server as any).handleDeleteEntities.bind(server);
      const result = await handler({
        entityNames: ['ToDelete'],
      });

      expect(result.isError).toBeUndefined();
    });

    it('delete_observations: 관찰 삭제', async () => {
      // 먼저 엔티티 생성
      const createHandler = (server as any).handleCreateEntities.bind(server);
      await createHandler({
        entities: [
          { name: 'Entity1', entityType: 'Type1', observations: ['obs1', 'obs2'] },
        ],
      });

      const handler = (server as any).handleDeleteObservations.bind(server);
      const result = await handler({
        deletions: [
          {
            entityName: 'Entity1',
            observations: ['obs1'],
          },
        ],
      });

      expect(result.isError).toBeUndefined();
    });

    it('delete_relations: 관계 삭제', async () => {
      // 먼저 엔티티와 관계 생성
      const createEntityHandler = (server as any).handleCreateEntities.bind(server);
      await createEntityHandler({
        entities: [
          { name: 'E1', entityType: 'T1', observations: [] },
          { name: 'E2', entityType: 'T2', observations: [] },
        ],
      });

      const createRelHandler = (server as any).handleCreateRelations.bind(server);
      await createRelHandler({
        relations: [
          { from: 'E1', to: 'E2', relationType: 'relates' },
        ],
      });

      const handler = (server as any).handleDeleteRelations.bind(server);
      const result = await handler({
        relations: [
          { from: 'E1', to: 'E2', relationType: 'relates' },
        ],
      });

      expect(result.isError).toBeUndefined();
    });

    it('read_graph: 전체 그래프 읽기', async () => {
      // 먼저 데이터 생성
      const createHandler = (server as any).handleCreateEntities.bind(server);
      await createHandler({
        entities: [
          { name: 'Entity1', entityType: 'Type1', observations: [] },
        ],
      });

      const handler = (server as any).handleReadGraph.bind(server);
      const result = await handler({});

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.entities).toBeDefined();
      expect(data.relations).toBeDefined();
    });

    it('search_nodes: 노드 검색', async () => {
      // 먼저 데이터 생성
      const createHandler = (server as any).handleCreateEntities.bind(server);
      await createHandler({
        entities: [
          { name: 'SearchMe', entityType: 'Type1', observations: [] },
        ],
      });

      const handler = (server as any).handleSearchNodes.bind(server);
      const result = await handler({
        query: 'Search',
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data)).toBe(true);
    });

    it('search_nodes: 빈 쿼리는 에러 반환', async () => {
      const handler = (server as any).handleSearchNodes.bind(server);

      const result = await handler({
        query: '   ',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('cannot be empty');
    });

    it('open_nodes: 특정 노드 조회', async () => {
      // 먼저 엔티티 생성
      const createHandler = (server as any).handleCreateEntities.bind(server);
      await createHandler({
        entities: [
          { name: 'OpenMe', entityType: 'Type1', observations: ['obs1'] },
        ],
      });

      const handler = (server as any).handleOpenNodes.bind(server);
      const result = await handler({
        names: ['OpenMe'],
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data)).toBe(true);
      expect(data[0].name).toBe('OpenMe');
    });

    it('open_nodes: 존재하지 않는 노드는 에러 반환', async () => {
      const handler = (server as any).handleOpenNodes.bind(server);

      const result = await handler({
        names: ['NonExistent'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
      expect(result.content[0].text).toContain('NonExistent');
    });
  });

  describe('파라미터 검증', () => {
    it('빈 배열은 에러 반환', async () => {
      const handler = (server as any).handleCreateEntities.bind(server);

      const result = await handler({
        entities: [],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('cannot be empty');
    });

    it('배열이 아닌 값은 에러 반환', async () => {
      const handler = (server as any).handleCreateEntities.bind(server);

      const result = await handler({
        entities: 'not an array',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('must be an array');
    });

    it('필수 필드 누락 시 에러 반환', async () => {
      const handler = (server as any).handleCreateEntities.bind(server);

      const result = await handler({
        entities: [
          {
            name: 'Entity1',
            // entityType 누락
            observations: [],
          },
        ],
      });

      expect(result.isError).toBe(true);
    });

    it('잘못된 타입은 에러 반환', async () => {
      const handler = (server as any).handleCreateEntities.bind(server);

      const result = await handler({
        entities: [
          {
            name: 'Entity1',
            entityType: 'Type1',
            observations: 'not an array', // 배열이어야 함
          },
        ],
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('에러 메시지 형식', () => {
    it('에러는 한국어 설명 포함', async () => {
      const handler = (server as any).handleCreateEntities.bind(server);

      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid arguments');
      expect(result.content[0].text).toContain('잘못된 인자');
    });

    it('누락된 엔티티 에러는 이름 포함', async () => {
      const handler = (server as any).handleCreateRelations.bind(server);

      const result = await handler({
        relations: [
          {
            from: 'Missing1',
            to: 'Missing2',
            relationType: 'relates',
          },
        ],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing1');
      expect(result.content[0].text).toContain('Missing2');
    });
  });

  describe('응답 형식', () => {
    it('성공 응답은 올바른 형식', async () => {
      const handler = (server as any).handleCreateEntities.bind(server);

      const result = await handler({
        entities: [
          { name: 'E1', entityType: 'T1', observations: [] },
        ],
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
      expect(result.isError).toBeUndefined();
    });

    it('에러 응답은 올바른 형식', async () => {
      const handler = (server as any).handleCreateEntities.bind(server);

      const result = await handler({});

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(typeof result.content[0].text).toBe('string');
      expect(result.isError).toBe(true);
    });

    it('JSON 응답은 파싱 가능', async () => {
      const handler = (server as any).handleCreateEntities.bind(server);

      const result = await handler({
        entities: [
          { name: 'E1', entityType: 'T1', observations: ['obs1'] },
        ],
      });

      expect(() => {
        JSON.parse(result.content[0].text);
      }).not.toThrow();
    });
  });
});
