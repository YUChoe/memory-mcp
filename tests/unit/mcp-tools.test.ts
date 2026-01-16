/**
 * MCP 도구 단위 테스트
 * 각 도구의 파라미터 검증과 에러 응답 형식을 테스트합니다.
 * Requirements: 6.4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { MCPServer } from '../../src/mcp-server.js';

let testDir: string;
let server: MCPServer;

beforeEach(async () => {
  testDir = path.join(os.tmpdir(), `kg-mcp-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(testDir, { recursive: true });
  server = new MCPServer(testDir);
  await server['manager'].loadFromStorage();
});

afterEach(async () => {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    // 정리 실패는 무시
  }
});

// ============================================================================
// create_entities 파라미터 검증 테스트
// ============================================================================

describe('create_entities 파라미터 검증', () => {
  it('entities 파라미터가 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleCreateEntities']({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('entities array is required');
  });

  it('entities가 배열이 아니면 에러를 반환해야 함', async () => {
    const result = await server['handleCreateEntities']({ entities: 'not-array' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('entities must be an array');
  });

  it('엔티티에 name이 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleCreateEntities']({
      entities: [{ entityType: 'test', observations: [] }]
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name, entityType, and observations are required');
  });

  it('엔티티에 entityType이 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleCreateEntities']({
      entities: [{ name: 'test', observations: [] }]
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name, entityType, and observations are required');
  });

  it('엔티티에 observations가 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleCreateEntities']({
      entities: [{ name: 'test', entityType: 'test' }]
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name, entityType, and observations are required');
  });

  it('observations가 배열이 아니면 에러를 반환해야 함', async () => {
    const result = await server['handleCreateEntities']({
      entities: [{ name: 'test', entityType: 'test', observations: 'not-array' }]
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name, entityType, and observations are required');
  });
});

// ============================================================================
// create_relations 파라미터 검증 테스트
// ============================================================================

describe('create_relations 파라미터 검증', () => {
  it('relations 파라미터가 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleCreateRelations']({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('relations array is required');
  });

  it('relations가 배열이 아니면 에러를 반환해야 함', async () => {
    const result = await server['handleCreateRelations']({ relations: 'not-array' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('relations must be an array');
  });

  it('관계에 from이 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleCreateRelations']({
      relations: [{ to: 'target', relationType: 'relates_to' }]
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('from, to, and relationType are required');
  });

  it('관계에 to가 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleCreateRelations']({
      relations: [{ from: 'source', relationType: 'relates_to' }]
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('from, to, and relationType are required');
  });

  it('관계에 relationType이 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleCreateRelations']({
      relations: [{ from: 'source', to: 'target' }]
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('from, to, and relationType are required');
  });
});

// ============================================================================
// add_observations 파라미터 검증 테스트
// ============================================================================

describe('add_observations 파라미터 검증', () => {
  it('observations 파라미터가 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleAddObservations']({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('observations array is required');
  });

  it('observations가 배열이 아니면 에러를 반환해야 함', async () => {
    const result = await server['handleAddObservations']({ observations: 'not-array' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('observations must be an array');
  });

  it('관찰에 entityName이 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleAddObservations']({
      observations: [{ contents: ['test'] }]
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('entityName and contents array are required');
  });

  it('관찰에 contents가 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleAddObservations']({
      observations: [{ entityName: 'test' }]
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('entityName and contents array are required');
  });

  it('contents가 배열이 아니면 에러를 반환해야 함', async () => {
    const result = await server['handleAddObservations']({
      observations: [{ entityName: 'test', contents: 'not-array' }]
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('entityName and contents array are required');
  });
});

// ============================================================================
// delete_entities 파라미터 검증 테스트
// ============================================================================

describe('delete_entities 파라미터 검증', () => {
  it('entityNames 파라미터가 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleDeleteEntities']({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('entityNames array is required');
  });

  it('entityNames가 배열이 아니면 에러를 반환해야 함', async () => {
    const result = await server['handleDeleteEntities']({ entityNames: 'not-array' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('entityNames must be an array');
  });

  it('entityNames에 문자열이 아닌 값이 있으면 에러를 반환해야 함', async () => {
    const result = await server['handleDeleteEntities']({ entityNames: ['valid', 123, 'valid2'] });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('all entity names must be strings');
  });
});

// ============================================================================
// delete_observations 파라미터 검증 테스트
// ============================================================================

describe('delete_observations 파라미터 검증', () => {
  it('deletions 파라미터가 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleDeleteObservations']({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('deletions array is required');
  });

  it('deletions가 배열이 아니면 에러를 반환해야 함', async () => {
    const result = await server['handleDeleteObservations']({ deletions: 'not-array' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('deletions must be an array');
  });

  it('삭제에 entityName이 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleDeleteObservations']({
      deletions: [{ observations: ['test'] }]
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('entityName and observations array are required');
  });

  it('삭제에 observations가 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleDeleteObservations']({
      deletions: [{ entityName: 'test' }]
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('entityName and observations array are required');
  });
});

// ============================================================================
// delete_relations 파라미터 검증 테스트
// ============================================================================

describe('delete_relations 파라미터 검증', () => {
  it('relations 파라미터가 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleDeleteRelations']({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('relations array is required');
  });

  it('relations가 배열이 아니면 에러를 반환해야 함', async () => {
    const result = await server['handleDeleteRelations']({ relations: 'not-array' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('relations must be an array');
  });

  it('관계에 필수 필드가 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleDeleteRelations']({
      relations: [{ from: 'source' }]
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('from, to, and relationType are required');
  });
});

// ============================================================================
// search_nodes 파라미터 검증 테스트
// ============================================================================

describe('search_nodes 파라미터 검증', () => {
  it('query 파라미터가 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleSearchNodes']({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('query string is required');
  });

  it('query가 문자열이 아니면 에러를 반환해야 함', async () => {
    const result = await server['handleSearchNodes']({ query: 123 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('query must be a string');
  });
});

// ============================================================================
// open_nodes 파라미터 검증 테스트
// ============================================================================

describe('open_nodes 파라미터 검증', () => {
  it('names 파라미터가 없으면 에러를 반환해야 함', async () => {
    const result = await server['handleOpenNodes']({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('names array is required');
  });

  it('names가 배열이 아니면 에러를 반환해야 함', async () => {
    const result = await server['handleOpenNodes']({ names: 'not-array' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('names must be an array');
  });

  it('names에 문자열이 아닌 값이 있으면 에러를 반환해야 함', async () => {
    const result = await server['handleOpenNodes']({ names: ['valid', 123, 'valid2'] });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('all names must be strings');
  });
});

// ============================================================================
// 에러 응답 형식 테스트
// ============================================================================

describe('에러 응답 형식', () => {
  it('에러 응답은 isError 플래그를 포함해야 함', async () => {
    const result = await server['handleCreateEntities']({});

    expect(result.isError).toBe(true);
  });

  it('에러 응답은 content 배열을 포함해야 함', async () => {
    const result = await server['handleCreateEntities']({});

    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content.length).toBeGreaterThan(0);
  });

  it('에러 응답의 content는 type과 text를 포함해야 함', async () => {
    const result = await server['handleCreateEntities']({});

    expect(result.content[0].type).toBe('text');
    expect(typeof result.content[0].text).toBe('string');
  });

  it('성공 응답은 isError 플래그가 없거나 false여야 함', async () => {
    // 먼저 엔티티 생성
    await server['manager'].createEntities([
      { name: 'test', entityType: 'test', observations: ['obs1'] }
    ]);

    const result = await server['handleReadGraph']({});

    expect(result.isError).toBeUndefined();
  });

  it('성공 응답은 content 배열을 포함해야 함', async () => {
    const result = await server['handleReadGraph']({});

    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content.length).toBeGreaterThan(0);
  });

  it('성공 응답의 content는 type과 text를 포함해야 함', async () => {
    const result = await server['handleReadGraph']({});

    expect(result.content[0].type).toBe('text');
    expect(typeof result.content[0].text).toBe('string');
  });
});

// ============================================================================
// 비즈니스 로직 에러 테스트
// ============================================================================

describe('비즈니스 로직 에러', () => {
  it('중복 엔티티 생성 시 에러를 반환해야 함', async () => {
    // 첫 번째 엔티티 생성
    await server['handleCreateEntities']({
      entities: [{ name: 'duplicate', entityType: 'test', observations: [] }]
    });

    // 중복 엔티티 생성 시도
    const result = await server['handleCreateEntities']({
      entities: [{ name: 'duplicate', entityType: 'test', observations: [] }]
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('duplicate');
  });

  it('존재하지 않는 엔티티에 관계 생성 시 에러를 반환해야 함', async () => {
    const result = await server['handleCreateRelations']({
      relations: [{ from: 'nonexistent', to: 'also-nonexistent', relationType: 'relates_to' }]
    });

    expect(result.isError).toBe(true);
  });

  it('존재하지 않는 엔티티에 관찰 추가 시 에러를 반환해야 함', async () => {
    const result = await server['handleAddObservations']({
      observations: [{ entityName: 'nonexistent', contents: ['test'] }]
    });

    expect(result.isError).toBe(true);
  });
});
