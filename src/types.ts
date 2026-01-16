/**
 * Knowledge Graph MCP Server 타입 정의
 */

// ============================================================================
// 엔티티 타입
// ============================================================================

/**
 * 지식 그래프의 엔티티
 */
export interface Entity {
  name: string;              // 엔티티의 고유 이름
  entityType: string;        // 엔티티 타입
  observations: string[];    // 관찰 내용 목록
}

/**
 * 엔티티 생성 입력
 */
export interface EntityInput {
  name: string;
  entityType: string;
  observations: string[];
}

// ============================================================================
// 관계 타입
// ============================================================================

/**
 * 엔티티 간의 관계
 */
export interface Relation {
  from: string;              // 시작 엔티티 이름
  to: string;                // 종료 엔티티 이름
  relationType: string;      // 관계 타입 (능동태)
}

/**
 * 관계 생성 입력
 */
export interface RelationInput {
  from: string;
  to: string;
  relationType: string;
}

// ============================================================================
// 관찰 타입
// ============================================================================

/**
 * 관찰 내용 추가 입력
 */
export interface ObservationAddition {
  entityName: string;
  contents: string[];
}

/**
 * 관찰 내용 삭제 입력
 */
export interface ObservationDeletion {
  entityName: string;
  observations: string[];
}

// ============================================================================
// 지식 그래프 타입
// ============================================================================

/**
 * 지식 그래프
 */
export interface KnowledgeGraph {
  entities: Map<string, Entity>;    // 이름으로 인덱싱된 엔티티
  relations: Relation[];            // 관계 목록
}

/**
 * JSON 직렬화를 위한 지식 그래프 형식
 */
export interface KnowledgeGraphJSON {
  entities: Entity[];
  relations: Relation[];
}

// ============================================================================
// 결과 타입
// ============================================================================

/**
 * 작업 성공 결과
 */
export interface SuccessResult<T> {
  success: true;
  data: T;
}

/**
 * 작업 실패 결과
 */
export interface ErrorResult {
  success: false;
  error: string;
  errorKo?: string;
  details?: unknown;
}

/**
 * 작업 결과 타입
 */
export type Result<T> = SuccessResult<T> | ErrorResult;

// ============================================================================
// MCP 도구 결과 타입
// ============================================================================

/**
 * MCP 도구 실행 결과
 */
export interface ToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}
