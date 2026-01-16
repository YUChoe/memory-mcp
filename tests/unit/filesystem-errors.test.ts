/**
 * 파일 시스템 에러 테스트
 * 요구사항: 8.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GraphStorage } from '../../src/graph-storage.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('파일 시스템 에러 테스트', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `kg-test-${Date.now()}-${Math.random()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // 정리 실패는 무시
    }
  });

  it('손상된 JSON 파일 처리', async () => {
    const storage = new GraphStorage(testDir);
    const storagePath = storage.getStoragePath();

    // 손상된 JSON 파일 생성
    const dir = path.dirname(storagePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(storagePath, '{ invalid json }', 'utf-8');

    // 로드 시도
    await expect(storage.load()).rejects.toThrow(/Invalid JSON format/);
  });

  it('빈 파일 처리', async () => {
    const storage = new GraphStorage(testDir);
    const storagePath = storage.getStoragePath();

    // 빈 파일 생성
    const dir = path.dirname(storagePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(storagePath, '', 'utf-8');

    // 로드 시도
    await expect(storage.load()).rejects.toThrow();
  });

  it('잘못된 JSON 구조 처리', async () => {
    const storage = new GraphStorage(testDir);
    const storagePath = storage.getStoragePath();

    // 잘못된 구조의 JSON 파일 생성
    const dir = path.dirname(storagePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(storagePath, '{"wrong": "structure"}', 'utf-8');

    // 로드 시도 - 구조가 잘못되어도 에러가 발생할 수 있음
    try {
      await storage.load();
    } catch (error) {
      // 에러가 발생하면 에러 메시지가 있어야 함
      expect(error).toBeDefined();
      expect(error instanceof Error).toBe(true);
    }
  });

  it('파일이 없을 때 빈 그래프 반환', async () => {
    const storage = new GraphStorage(testDir);

    // 파일이 없는 상태에서 로드
    const graph = await storage.load();

    // 빈 그래프가 반환되어야 함
    expect(graph.entities.size).toBe(0);
    expect(graph.relations.length).toBe(0);
  });

  it('저장 시 디렉토리 자동 생성', async () => {
    const nonExistentDir = path.join(testDir, 'nested', 'deep', 'path');
    const storage = new GraphStorage(nonExistentDir);

    // 디렉토리가 없는 상태에서 저장
    await storage.save({
      entities: new Map(),
      relations: [],
    });

    // 파일이 생성되었는지 확인
    const storagePath = storage.getStoragePath();
    const exists = await fs.access(storagePath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('에러 메시지에 한국어 설명 포함', async () => {
    const storage = new GraphStorage(testDir);
    const storagePath = storage.getStoragePath();

    // 손상된 JSON 파일 생성
    const dir = path.dirname(storagePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(storagePath, '{ invalid }', 'utf-8');

    // 로드 시도
    try {
      await storage.load();
      expect.fail('에러가 발생해야 합니다');
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      const errorMsg = (error as Error).message;

      // 한국어 설명이 포함되어야 함
      expect(errorMsg).toContain('저장 파일을 읽을 수 없습니다');
      expect(errorMsg).toContain('잘못된 JSON 형식');
    }
  });

  it('저장 경로가 에러 메시지에 포함', async () => {
    const storage = new GraphStorage(testDir);
    const storagePath = storage.getStoragePath();

    // 손상된 JSON 파일 생성
    const dir = path.dirname(storagePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(storagePath, 'not json', 'utf-8');

    // 로드 시도
    try {
      await storage.load();
      expect.fail('에러가 발생해야 합니다');
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      const errorMsg = (error as Error).message;

      // 저장 경로가 포함되어야 함
      expect(errorMsg).toContain(storagePath);
    }
  });
});
