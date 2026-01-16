# 설계 문서: Knowledge Graph MCP Server

## 개요

Knowledge Graph MCP Server는 TypeScript로 구현된 MCP(Model Context Protocol) 서버로, 엔티티와 관계로 구성된 지식 그래프를 관리합니다. 서버는 npx를 통해 실행 가능하며, JSON 파일을 사용하여 데이터를 영구 저장합니다.

핵심 설계 원칙:
- 단순성: JSON 기반의 간단한 저장 구조
- 안전성: 동시 작업에 대한 데이터 무결성 보장
- 확장성: MCP 프로토콜을 통한 표준화된 인터페이스
- 영구성: 세션 간 데이터 지속성

## 아키텍처

시스템은 다음 계층으로 구성됩니다:

```
┌─────────────────────────────────────┐
│      MCP 클라이언트 (Kiro 등)       │
└──────────────┬──────────────────────┘
               │ MCP 프로토콜
┌──────────────▼──────────────────────┐
│         MCP 서버 계층               │
│  - 도구 등록                        │
│  - 요청 처리                        │
│  - 응답 포맷팅                      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      지식 그래프 관리자             │
│  - 엔티티 작업                      │
│  - 관계 작업                        │
│  - 관찰 작업                        │
│  - 검색 작업                        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│        저장소 계층                  │
│  - JSON 직렬화                      │
│  - 파일 입출력                      │
│  - 동시 접근 제어                   │
└─────────────────────────────────────┘
```

### 컴포넌트 책임

1. MCP 서버 계층: MCP 프로토콜 구현, 도구 등록 및 요청 처리
2. 지식 그래프 관리자: 비즈니스 로직, 그래프 작업 수행
3. 저장소 계층: 데이터 영구 저장 및 로드

## 컴포넌트 및 인터페이스

### 1. MCP 서버 컴포넌트

MCP 프로토콜을 구현하고 9개의 도구를 노출합니다.

```typescript
interface MCPServer {
  // 서버 초기화 및 시작
  start(): Promise<void>;

  // 도구 등록
  registerTools(): void;

  // 도구 실행 핸들러
  handleToolCall(toolName: string, params: unknown): Promise<ToolResult>;
}
```

### 2. 지식 그래프 관리자

그래프 작업을 관리하는 핵심 컴포넌트입니다.

```typescript
interface KnowledgeGraphManager {
  // Entity 작업
  createEntities(entities: EntityInput[]): Result<Entity[]>;
  openNodes(names: string[]): Result<Entity[]>;
  deleteEntities(names: string[]): Result<void>;

  // Relation 작업
  createRelations(relations: RelationInput[]): Result<Relation[]>;
  deleteRelations(relations: RelationInput[]): Result<void>;

  // Observation 작업
  addObservations(additions: ObservationAddition[]): Result<void>;
  deleteObservations(deletions: ObservationDeletion[]): Result<void>;

  // 조회 작업
  readGraph(): Result<KnowledgeGraph>;
  searchNodes(query: string): Result<Entity[]>;
}
```

### 3. 저장소 계층

데이터 영구 저장을 담당합니다.

```typescript
interface GraphStorage {
  // 그래프 로드
  load(): Promise<KnowledgeGraph>;

  // 그래프 저장
  save(graph: KnowledgeGraph): Promise<void>;

  // 저장 경로 결정
  getStoragePath(): string;
}
```

## 데이터 모델

### 엔티티(Entity)

```typescript
interface Entity {
  name: string;              // 엔티티의 고유 이름
  entityType: string;        // 엔티티 타입
  observations: string[];    // 관찰 내용 목록
}

interface EntityInput {
  name: string;
  entityType: string;
  observations: string[];
}
```

### 관계(Relation)

```typescript
interface Relation {
  from: string;              // 시작 엔티티 이름
  to: string;                // 종료 엔티티 이름
  relationType: string;      // 관계 타입 (능동태)
}

interface RelationInput {
  from: string;
  to: string;
  relationType: string;
}
```

### 지식 그래프(Knowledge Graph)

```typescript
interface KnowledgeGraph {
  entities: Map<string, Entity>;    // 이름으로 인덱싱된 엔티티
  relations: Relation[];            // 관계 목록
}
```

### 작업 결과(Operation Results)

```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

interface ToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
}
```

### 저장 형식(Storage Format)

JSON 파일 형식:

```json
{
  "entities": [
    {
      "name": "Entity1",
      "entityType": "Type1",
      "observations": ["observation1", "observation2"]
    }
  ],
  "relations": [
    {
      "from": "Entity1",
      "to": "Entity2",
      "relationType": "relates_to"
    }
  ]
}
```


## 정확성 속성(Correctness Properties)

속성(Property)은 시스템의 모든 유효한 실행에서 참이어야 하는 특성 또는 동작입니다. 속성은 사람이 읽을 수 있는 명세와 기계가 검증할 수 있는 정확성 보장 사이의 다리 역할을 합니다.

### 속성 1: 엔티티 생성 및 조회

모든 유효한 엔티티 입력(이름, 타입, 관찰 내용)에 대해, 엔티티를 생성한 후 이름으로 조회하면 동일한 정보가 반환되어야 합니다.

검증 대상: Requirements 1.1, 1.2

### 속성 2: 엔티티 삭제 시 관계 연쇄 삭제

모든 엔티티와 해당 엔티티와 연결된 관계들에 대해, 엔티티를 삭제하면 해당 엔티티와 모든 관련 관계가 그래프에서 제거되어야 합니다.

검증 대상: Requirements 1.3, 2.4

### 속성 3: 중복 엔티티 이름 거부

모든 그래프에 이미 존재하는 엔티티 이름에 대해, 동일한 이름으로 새 엔티티를 생성하려고 하면 에러가 반환되고 그래프는 변경되지 않아야 합니다.

검증 대상: Requirements 1.5

### 속성 4: 관계 생성 및 조회

모든 두 개의 존재하는 엔티티와 관계 타입에 대해, 관계를 생성한 후 그래프를 읽으면 해당 관계가 포함되어야 합니다.

검증 대상: Requirements 2.1

### 속성 5: 관계는 존재하는 엔티티 필요

모든 존재하지 않는 엔티티 이름을 포함하는 관계 입력에 대해, 관계 생성을 시도하면 에러가 반환되고 그래프는 변경되지 않아야 합니다.

검증 대상: Requirements 2.2

### 속성 6: 관계 삭제는 선택적

모든 그래프에 여러 관계가 있을 때, 특정 관계를 삭제하면 해당 관계만 제거되고 다른 관계는 유지되어야 합니다.

검증 대상: Requirements 2.3

### 속성 7: 관찰 내용 추가

모든 존재하는 엔티티와 새로운 관찰 내용에 대해, 관찰 내용을 추가한 후 엔티티를 조회하면 기존 관찰 내용과 새 관찰 내용이 모두 포함되어야 합니다.

검증 대상: Requirements 3.1

### 속성 8: 관찰 내용 삭제는 선택적

모든 엔티티의 여러 관찰 내용 중 일부에 대해, 특정 관찰 내용을 삭제하면 해당 관찰만 제거되고 다른 관찰은 유지되어야 합니다.

검증 대상: Requirements 3.2

### 속성 9: 관찰 내용은 존재하는 엔티티 필요

모든 존재하지 않는 엔티티 이름에 대해, 해당 엔티티에 관찰 내용을 추가하려고 하면 에러가 반환되고 그래프는 변경되지 않아야 합니다.

검증 대상: Requirements 3.3

### 속성 10: 그래프 읽기는 모든 데이터 반환

모든 그래프 상태에 대해, 그래프를 읽으면 모든 엔티티와 모든 관계가 반환되어야 합니다.

검증 대상: Requirements 4.1

### 속성 11: 검색은 일치하는 엔티티 반환

모든 검색 쿼리에 대해, 검색 결과의 모든 엔티티는 이름, 타입, 또는 관찰 내용에 쿼리 문자열을 포함해야 하며, 쿼리와 일치하는 모든 엔티티가 결과에 포함되어야 합니다.

검증 대상: Requirements 4.2, 4.3

### 속성 12: 영속성 라운드 트립

모든 유효한 그래프 상태에 대해, 그래프를 JSON으로 직렬화한 후 역직렬화하면 동일한 그래프가 생성되어야 합니다.

검증 대상: Requirements 5.5

### 속성 13: 데이터는 재시작 후에도 유지

모든 그래프 수정 작업에 대해, 작업 수행 후 서버를 재시작하면 수정된 데이터가 유지되어야 합니다.

검증 대상: Requirements 5.1, 5.2

### 속성 14: 잘못된 파라미터는 에러 반환

모든 MCP 도구와 잘못된 파라미터에 대해, 도구를 호출하면 설명적인 에러 메시지가 반환되어야 합니다.

검증 대상: Requirements 6.4

### 속성 15: 누락된 엔티티 에러는 이름 포함

모든 존재하지 않는 엔티티 이름을 참조하는 작업에 대해, 에러 메시지에 찾을 수 없는 엔티티 이름이 포함되어야 합니다.

검증 대상: Requirements 8.2

### 속성 16: 동시 작업은 일관성 유지

모든 동시에 실행되는 여러 작업에 대해, 모든 작업이 완료된 후 그래프는 일관된 상태를 유지해야 합니다 (엔티티 없이 관계가 존재하지 않음, 중복 엔티티 없음).

검증 대상: Requirements 7.1, 7.2, 7.3

## 에러 처리

### 에러 카테고리

1. 검증 에러
   - 중복 엔티티 이름
   - 존재하지 않는 엔티티 참조
   - 잘못된 파라미터 타입
   - 빈 문자열 또는 null 값

2. 저장소 에러
   - 파일 읽기/쓰기 실패
   - JSON 파싱 오류
   - 디스크 공간 부족
   - 권한 오류

3. 동시성 에러
   - 동시 쓰기 충돌
   - 데이터 불일치

### 에러 응답 형식

모든 에러는 다음 형식으로 반환됩니다:

```typescript
interface ErrorResponse {
  success: false;
  error: string;           // 영문 에러 메시지
  errorKo?: string;        // 한국어 설명 (선택적)
  details?: unknown;       // 추가 정보 (선택적)
}
```

### 에러 처리 전략

1. 검증: 작업 수행 전 모든 입력 검증
2. 원자적 작업: 부분 실패 시 롤백
3. 설명적 메시지: 구체적이고 실행 가능한 에러 메시지
4. 우아한 성능 저하: 복구 가능한 에러는 경고로 처리
5. 로깅: 모든 에러를 로그에 기록

### 구체적인 에러 시나리오

중복 엔티티 생성:
```
Error: Entity with name "EntityName" already exists
ErrorKo: "EntityName" 이름을 가진 엔티티가 이미 존재합니다
```

존재하지 않는 엔티티 참조:
```
Error: Entities not found: ["Entity1", "Entity2"]
ErrorKo: 다음 엔티티를 찾을 수 없습니다: ["Entity1", "Entity2"]
```

손상된 JSON 파일:
```
Error: Failed to parse storage file: Invalid JSON
ErrorKo: 저장 파일을 읽을 수 없습니다: 잘못된 JSON 형식
```

## 테스트 전략

### 이중 테스트 접근법

이 프로젝트는 단위 테스트와 속성 기반 테스트를 모두 사용합니다:

- 단위 테스트: 특정 예제, 엣지 케이스, 에러 조건 검증
- 속성 기반 테스트: 모든 입력에 대한 보편적 속성 검증

두 접근 방식은 상호 보완적이며 포괄적인 커버리지를 제공합니다.

### 속성 기반 테스트

라이브러리: [fast-check](https://github.com/dubzzz/fast-check) (TypeScript/JavaScript용)

설정:
- 각 속성 테스트는 최소 100회 반복 실행
- 각 테스트는 설계 문서의 속성을 참조하는 주석 포함
- 태그 형식: `// Feature: knowledge-graph-mcp-server, Property N: [속성 제목]`

테스트할 속성:
1. 엔티티 생성 및 조회 (속성 1)
2. 엔티티 삭제 시 관계 연쇄 삭제 (속성 2)
3. 중복 엔티티 이름 거부 (속성 3)
4. 관계 생성 및 조회 (속성 4)
5. 관계는 존재하는 엔티티 필요 (속성 5)
6. 관계 삭제는 선택적 (속성 6)
7. 관찰 내용 추가 (속성 7)
8. 관찰 내용 삭제는 선택적 (속성 8)
9. 관찰 내용은 존재하는 엔티티 필요 (속성 9)
10. 그래프 읽기는 모든 데이터 반환 (속성 10)
11. 검색은 일치하는 엔티티 반환 (속성 11)
12. 영속성 라운드 트립 (속성 12)
13. 데이터는 재시작 후에도 유지 (속성 13)
14. 잘못된 파라미터는 에러 반환 (속성 14)
15. 누락된 엔티티 에러는 이름 포함 (속성 15)
16. 동시 작업은 일관성 유지 (속성 16)

### 단위 테스트

프레임워크: Jest 또는 Vitest

테스트 범위:
1. 엣지 케이스
   - 빈 그래프 작업
   - 빈 문자열 처리
   - 매우 긴 이름/관찰 내용
   - 특수 문자 처리

2. 통합 테스트
   - MCP 프로토콜 준수
   - 도구 등록 및 호출
   - 전체 워크플로우 시나리오

3. 에러 조건
   - 손상된 JSON 파일
   - 파일 시스템 에러
   - 잘못된 파라미터 타입

### 테스트 구조

```
tests/
├── unit/
│   ├── entity.test.ts
│   ├── relation.test.ts
│   ├── observation.test.ts
│   ├── search.test.ts
│   └── storage.test.ts
├── property/
│   ├── entity.property.test.ts
│   ├── relation.property.test.ts
│   ├── observation.property.test.ts
│   ├── search.property.test.ts
│   ├── persistence.property.test.ts
│   └── concurrency.property.test.ts
└── integration/
    ├── mcp-protocol.test.ts
    └── end-to-end.test.ts
```

### 커버리지 목표

- 라인 커버리지: 최소 80%
- 브랜치 커버리지: 최소 75%
- 모든 MCP 도구: 100% 커버리지
- 모든 에러 경로: 100% 커버리지
