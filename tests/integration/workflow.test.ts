/**
 * 통합 테스트: 전체 워크플로우 시나리오
 *
 * 요구사항: 6.1
 *
 * 이 테스트는 실제 사용 시나리오를 시뮬레이션하여
 * 전체 시스템이 올바르게 작동하는지 검증합니다.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KnowledgeGraphManager } from '../../src/knowledge-graph-manager.js';
import { GraphStorage } from '../../src/graph-storage.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('통합 테스트: 전체 워크플로우', () => {
  let tempDir: string;
  let storagePath: string;
  let manager: KnowledgeGraphManager;

  beforeEach(async () => {
    // 임시 디렉토리 생성
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kg-test-'));
    storagePath = tempDir;

    const storage = new GraphStorage(storagePath);
    manager = new KnowledgeGraphManager(storage);
    await manager.loadFromStorage();
  });

  afterEach(async () => {
    // 임시 디렉토리 정리
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // 정리 실패는 무시
    }
  });

  it('시나리오 1: 프로젝트 지식 그래프 구축', async () => {
    // 1. 프로젝트 엔티티 생성
    const projectResult = await manager.createEntities([
      {
        name: 'MyProject',
        entityType: 'Project',
        observations: ['TypeScript 프로젝트', '2024년 시작'],
      },
    ]);
    expect(projectResult.success).toBe(true);

    // 2. 팀원 엔티티 생성
    const teamResult = await manager.createEntities([
      {
        name: 'Alice',
        entityType: 'Developer',
        observations: ['백엔드 전문가'],
      },
      {
        name: 'Bob',
        entityType: 'Developer',
        observations: ['프론트엔드 전문가'],
      },
    ]);
    expect(teamResult.success).toBe(true);

    // 3. 관계 생성
    const relationResult = await manager.createRelations([
      {
        from: 'Alice',
        to: 'MyProject',
        relationType: 'works_on',
      },
      {
        from: 'Bob',
        to: 'MyProject',
        relationType: 'works_on',
      },
    ]);
    expect(relationResult.success).toBe(true);

    // 4. 관찰 내용 추가
    const obsResult = await manager.addObservations([
      {
        entityName: 'Alice',
        contents: ['코드 리뷰 완료', '새 기능 구현 중'],
      },
    ]);
    expect(obsResult.success).toBe(true);

    // 5. 그래프 읽기로 전체 확인
    const graphResult = manager.readGraph();
    expect(graphResult.success).toBe(true);
    expect(graphResult.data?.entities.size).toBe(3);
    expect(graphResult.data?.relations.length).toBe(2);

    // 6. 검색 기능 확인
    const searchResult = manager.searchNodes('Developer');
    expect(searchResult.success).toBe(true);
    expect(searchResult.data?.length).toBe(2);

    // 7. 특정 엔티티 조회
    const openResult = manager.openNodes(['Alice']);
    expect(openResult.success).toBe(true);
    expect(openResult.data?.[0].observations.length).toBe(3);
  });

  it('시나리오 2: 데이터 수정 및 삭제', async () => {
    // 1. 초기 데이터 생성
    await manager.createEntities([
      { name: 'Task1', entityType: 'Task', observations: ['진행 중'] },
      { name: 'Task2', entityType: 'Task', observations: ['완료'] },
      { name: 'User1', entityType: 'User', observations: ['활성'] },
    ]);

    await manager.createRelations([
      { from: 'User1', to: 'Task1', relationType: 'assigned_to' },
      { from: 'User1', to: 'Task2', relationType: 'completed' },
    ]);

    // 2. 관찰 내용 추가
    const addResult = await manager.addObservations([
      { entityName: 'Task1', contents: ['우선순위 높음'] },
    ]);
    expect(addResult.success).toBe(true);

    // 3. 관찰 내용 삭제
    const delObsResult = await manager.deleteObservations([
      { entityName: 'Task1', observations: ['진행 중'] },
    ]);
    expect(delObsResult.success).toBe(true);

    // 4. 관계 삭제
    const delRelResult = await manager.deleteRelations([
      { from: 'User1', to: 'Task2', relationType: 'completed' },
    ]);
    expect(delRelResult.success).toBe(true);

    // 5. 엔티티 삭제 (관련 관계도 함께 삭제됨)
    const delEntityResult = await manager.deleteEntities(['Task2']);
    expect(delEntityResult.success).toBe(true);

    // 6. 최종 상태 확인
    const graphResult = manager.readGraph();
    expect(graphResult.data?.entities.size).toBe(2);
    expect(graphResult.data?.relations.length).toBe(1);

    const task1 = manager.openNodes(['Task1']);
    expect(task1.data?.[0].observations).toEqual(['우선순위 높음']);
  });

  it('시나리오 3: 영속성 검증', async () => {
    // 1. 데이터 생성
    await manager.createEntities([
      { name: 'Entity1', entityType: 'Type1', observations: ['obs1'] },
    ]);
    await manager.createRelations([
      { from: 'Entity1', to: 'Entity1', relationType: 'self_ref' },
    ]);

    // 2. 새 매니저 인스턴스로 데이터 로드
    const storage2 = new GraphStorage(storagePath);
    const manager2 = new KnowledgeGraphManager(storage2);
    await manager2.loadFromStorage();

    // 3. 데이터가 유지되는지 확인
    const graphResult = manager2.readGraph();
    expect(graphResult.success).toBe(true);
    expect(graphResult.data?.entities.size).toBe(1);
    expect(graphResult.data?.relations.length).toBe(1);

    const entity = manager2.openNodes(['Entity1']);
    expect(entity.success).toBe(true);
    expect(entity.data?.[0].observations).toEqual(['obs1']);
  });

  it('시나리오 4: 에러 처리 워크플로우', async () => {
    // 1. 중복 엔티티 생성 시도
    await manager.createEntities([
      { name: 'Duplicate', entityType: 'Type1', observations: [] },
    ]);
    const dupResult = await manager.createEntities([
      { name: 'Duplicate', entityType: 'Type2', observations: [] },
    ]);
    expect(dupResult.success).toBe(false);
    expect(dupResult.error).toContain('already exists');

    // 2. 존재하지 않는 엔티티에 관계 생성 시도
    const relResult = await manager.createRelations([
      { from: 'NonExistent', to: 'Duplicate', relationType: 'relates' },
    ]);
    expect(relResult.success).toBe(false);
    expect(relResult.error).toContain('not found');
    expect(relResult.error).toContain('NonExistent');

    // 3. 존재하지 않는 엔티티에 관찰 추가 시도
    const obsResult = await manager.addObservations([
      { entityName: 'NonExistent', contents: ['observation'] },
    ]);
    expect(obsResult.success).toBe(false);
    expect(obsResult.error).toContain('not found');

    // 4. 존재하지 않는 엔티티 조회
    const openResult = manager.openNodes(['NonExistent']);
    expect(openResult.success).toBe(false);
    expect(openResult.error).toContain('not found');

    // 5. 그래프는 일관된 상태 유지
    const graphResult = manager.readGraph();
    expect(graphResult.data?.entities.size).toBe(1);
    expect(graphResult.data?.relations.length).toBe(0);
  });

  it('시나리오 5: 복잡한 그래프 구조', async () => {
    // 1. 계층적 구조 생성
    await manager.createEntities([
      { name: 'Company', entityType: 'Organization', observations: [] },
      { name: 'Department1', entityType: 'Department', observations: [] },
      { name: 'Department2', entityType: 'Department', observations: [] },
      { name: 'Employee1', entityType: 'Person', observations: [] },
      { name: 'Employee2', entityType: 'Person', observations: [] },
      { name: 'Employee3', entityType: 'Person', observations: [] },
    ]);

    // 2. 계층 관계 생성
    await manager.createRelations([
      { from: 'Department1', to: 'Company', relationType: 'belongs_to' },
      { from: 'Department2', to: 'Company', relationType: 'belongs_to' },
      { from: 'Employee1', to: 'Department1', relationType: 'works_in' },
      { from: 'Employee2', to: 'Department1', relationType: 'works_in' },
      { from: 'Employee3', to: 'Department2', relationType: 'works_in' },
    ]);

    // 3. 동료 관계 추가
    await manager.createRelations([
      { from: 'Employee1', to: 'Employee2', relationType: 'collaborates_with' },
    ]);

    // 4. 그래프 구조 확인
    const graphResult = manager.readGraph();
    expect(graphResult.data?.entities.size).toBe(6);
    expect(graphResult.data?.relations.length).toBe(6);

    // 5. 타입별 검색
    const deptSearch = manager.searchNodes('Department');
    expect(deptSearch.data?.length).toBe(2);

    const personSearch = manager.searchNodes('Person');
    expect(personSearch.data?.length).toBe(3);

    // 6. 부서 삭제 시 관련 관계만 삭제됨
    await manager.deleteEntities(['Department1']);
    const afterDelete = manager.readGraph();
    expect(afterDelete.data?.entities.size).toBe(5);
    // Department1 관련 관계 3개 삭제됨
    expect(afterDelete.data?.relations.length).toBe(3);
  });

  it('시나리오 6: 검색 기능 종합', async () => {
    // 1. 다양한 엔티티 생성
    await manager.createEntities([
      {
        name: 'JavaScript',
        entityType: 'Language',
        observations: ['동적 타입', '웹 개발'],
      },
      {
        name: 'TypeScript',
        entityType: 'Language',
        observations: ['정적 타입', '웹 개발', 'JavaScript 슈퍼셋'],
      },
      {
        name: 'Python',
        entityType: 'Language',
        observations: ['동적 타입', '데이터 과학'],
      },
    ]);

    // 2. 이름으로 검색
    const nameSearch = manager.searchNodes('Type');
    expect(nameSearch.data?.length).toBe(1);
    expect(nameSearch.data?.[0].name).toBe('TypeScript');

    // 3. 타입으로 검색
    const typeSearch = manager.searchNodes('Language');
    expect(typeSearch.data?.length).toBe(3);

    // 4. 관찰 내용으로 검색
    const obsSearch = manager.searchNodes('동적 타입');
    expect(obsSearch.data?.length).toBe(2);

    const webSearch = manager.searchNodes('웹 개발');
    expect(webSearch.data?.length).toBe(2);

    // 5. 일치하지 않는 검색
    const noMatch = manager.searchNodes('Ruby');
    expect(noMatch.data?.length).toBe(0);

    // 6. 대소문자 구분 없는 검색
    const caseSearch = manager.searchNodes('javascript');
    expect(caseSearch.data?.length).toBeGreaterThan(0);
  });
});
