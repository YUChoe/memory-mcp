/**
 * Knowledge Graph Manager
 * 지식 그래프의 엔티티, 관계, 관찰 내용을 관리합니다.
 */
import { Entity, EntityInput, Relation, RelationInput, ObservationAddition, ObservationDeletion, KnowledgeGraph, Result } from './types.js';
import { GraphStorage } from './graph-storage.js';
export declare class KnowledgeGraphManager {
    private entities;
    private relations;
    private storage;
    private writeLock;
    constructor(storage: GraphStorage);
    /**
     * 쓰기 작업을 위한 락 획득
     */
    private acquireWriteLock;
    /**
     * 저장소에서 그래프 로드
     */
    loadFromStorage(): Promise<void>;
    /**
     * 저장소에 그래프 저장
     */
    private saveToStorage;
    /**
     * 엔티티 생성
     * default_user는 upsert 방식으로 동작 (이미 존재하면 기존 엔티티 반환)
     */
    createEntities(inputs: EntityInput[]): Promise<Result<Entity[]>>;
    /**
     * 엔티티 조회
     */
    openNodes(names: string[]): Result<Entity[]>;
    /**
     * 엔티티 삭제
     */
    deleteEntities(names: string[]): Promise<Result<void>>;
    /**
     * 관계 생성
     */
    createRelations(inputs: RelationInput[]): Promise<Result<Relation[]>>;
    /**
     * 관계 삭제
     */
    deleteRelations(inputs: RelationInput[]): Promise<Result<void>>;
    /**
     * 관찰 내용 추가
     */
    addObservations(additions: ObservationAddition[]): Promise<Result<void>>;
    /**
     * 관찰 내용 삭제
     */
    deleteObservations(deletions: ObservationDeletion[]): Promise<Result<void>>;
    /**
     * 그래프 읽기
     */
    readGraph(): Result<KnowledgeGraph>;
    /**
     * 노드 검색
     *
     * 쿼리를 공백으로 토큰화하여 각 토큰에 대해 OR 검색 수행
     * 하나 이상의 토큰이 엔티티의 이름, 타입, 또는 관찰 내용에 포함되면 매칭
     * 빈 쿼리는 모든 엔티티를 반환
     */
    searchNodes(query: string): Result<Entity[]>;
}
//# sourceMappingURL=knowledge-graph-manager.d.ts.map