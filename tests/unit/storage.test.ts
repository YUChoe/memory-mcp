/**
 * 저장소 단위 테스트
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { GraphStorage } from '../../src/graph-storage.js';
import { KnowledgeGraph } from '../../src/types.js';

let testDir: string;

beforeEach(async () => {
  testDir = path.join(os.tmpdir(), `kg-unit-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
// 빈 그래프 초기화 테스트 (Requirements 5.3)
// ============================================================================

describe('빈 그래프 초기화', () => {
  it('JSON 파일이 존재하지 않으면 빈 그래프를 반환해야 함', async () => {
    const storage = new GraphStorage(testDir);
    const graph = await storage.load();

    expect(graph.entities.size).toBe(0);
    expect(graph.relations.length).toBe(0);
  });

  it('새로운 디렉토리에서 빈 그래프를 저장하고 로드할 수 있어야 함', async () => {
    const storage = new GraphStorage(testDir);
    const emptyGraph: KnowledgeGraph = {
      entities: new Map(),
      relations: [],
    };

    await storage.save(emptyGraph);
    const loaded = await storage.load();

    expect(loaded.entities.size).toBe(0);
    expect(loaded.relations.length).toBe(0);
  });
});

// ============================================================================
// 손상된 JSON 파일 처리 테스트 (Requirements 5.4)
// ============================================================================

describe('손상된 JSON 파일 처리', () => {
  it('잘못된 JSON 형식의 파일을 로드하면 에러를 발생시켜야 함', async () => {
    const storage = new GraphStorage(testDir);
    const storagePath = storage.getStoragePath();

    // 손상된 JSON 파일 생성
    const dir = path.dirname(storagePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(storagePath, '{ invalid json }', 'utf-8');

    await expect(storage.load()).rejects.toThrow('Failed to load graph');
  });

  it('빈 파일을 로드하면 에러를 발생시켜야 함', async () => {
    const storage = new GraphStorage(testDir);
    const storagePath = storage.getStoragePath();

    // 빈 파일 생성
    const dir = path.dirname(storagePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(storagePath, '', 'utf-8');

    await expect(storage.load()).rejects.toThrow('Failed to load graph');
  });

  it('잘못된 구조의 JSON을 로드하면 에러를 발생시켜야 함', async () => {
    const storage = new GraphStorage(testDir);
    const storagePath = storage.getStoragePath();

    // 잘못된 구조의 JSON 파일 생성
    const dir = path.dirname(storagePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(storagePath, '{"wrong": "structure"}', 'utf-8');

    // 이 경우 로드는 성공하지만 데이터가 올바르지 않을 수 있음
    // 실제로는 타입 검증이 필요하지만 현재 구현에서는 런타임 에러가 발생할 수 있음
    await expect(storage.load()).rejects.toThrow();
  });
});

// ============================================================================
// 저장 경로 테스트
// ============================================================================

describe('저장 경로 결정', () => {
  it('프로젝트 경로가 제공되면 .kiro 디렉토리를 사용해야 함', () => {
    const projectPath = '/test/project';
    const storage = new GraphStorage(projectPath);
    const storagePath = storage.getStoragePath();

    expect(storagePath).toContain('.kiro');
    expect(storagePath).toContain('knowledge-graph.json');
  });

  it('프로젝트 경로가 없으면 홈 디렉토리를 사용해야 함', () => {
    const storage = new GraphStorage();
    const storagePath = storage.getStoragePath();

    expect(storagePath).toContain('.kiro');
    expect(storagePath).toContain('knowledge-graph.json');
  });
});
