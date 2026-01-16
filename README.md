# Knowledge Graph MCP Server

TypeScript로 구현된 MCP(Model Context Protocol) 서버로, 엔티티와 관계로 구성된 지식 그래프를 관리합니다. 엔티티 간의 관계를 추적하고, 시간에 따른 관찰 내용을 기록하며, 강력한 검색 기능을 제공합니다.

## 주요 기능

- **엔티티 관리**: 이름, 타입, 관찰 내용을 포함한 엔티티 생성, 조회, 삭제
- **관계 관리**: 엔티티 간의 방향성 있는 관계 생성 및 삭제
- **관찰 시스템**: 엔티티에 대한 시간별 관찰 내용 추가 및 삭제
- **검색 기능**: 이름, 타입, 관찰 내용으로 엔티티 검색
- **영속성**: JSON 파일을 통한 데이터 영구 저장
- **동시성 제어**: 안전한 동시 작업 처리
- **MCP 프로토콜**: 표준 MCP 프로토콜 준수

## 설치

### NPM을 통한 설치

```bash
npm install knowledge-graph-mcp-server
```

### 소스에서 빌드

```bash
git clone <repository-url>
cd knowledge-graph-mcp-server
npm install
npm run build
```

## 사용법

### MCP 클라이언트에서 사용

Kiro 또는 다른 MCP 클라이언트의 설정 파일에 서버를 추가합니다:

```json
{
  "mcpServers": {
    "knowledge-graph": {
      "command": "npx",
      "args": ["knowledge-graph-mcp-server"],
      "env": {}
    }
  }
}
```

특정 프로젝트 경로를 지정하려면:

```json
{
  "mcpServers": {
    "knowledge-graph": {
      "command": "npx",
      "args": ["knowledge-graph-mcp-server", "C:/path/to/project"],
      "env": {}
    }
  }
}
```

또는 `--storage-path` 플래그를 사용할 수도 있습니다:

```json
{
  "mcpServers": {
    "knowledge-graph": {
      "command": "npx",
      "args": ["knowledge-graph-mcp-server", "--storage-path", "C:/path/to/project"],
      "env": {}
    }
  }
}
```

### 저장 위치

- **프로젝트 경로 지정 시**: `<project-path>/.kiro/knowledge-graph.json`
- **경로 미지정 시**: `~/.kiro/knowledge-graph.json` (사용자 홈 디렉토리)

## API 문서

서버는 9개의 MCP 도구를 제공합니다:

### 1. create_entities

새로운 엔티티를 생성합니다.

**파라미터:**
```typescript
{
  entities: Array<{
    name: string;           // 엔티티의 고유 이름
    entityType: string;     // 엔티티 타입
    observations: string[]; // 초기 관찰 내용
  }>
}
```

**예제:**
```json
{
  "entities": [
    {
      "name": "TypeScript",
      "entityType": "programming-language",
      "observations": [
        "정적 타입 시스템을 제공합니다",
        "JavaScript의 상위 집합입니다"
      ]
    }
  ]
}
```

**응답:**
```json
[
  {
    "name": "TypeScript",
    "entityType": "programming-language",
    "observations": [
      "정적 타입 시스템을 제공합니다",
      "JavaScript의 상위 집합입니다"
    ]
  }
]
```

### 2. create_relations

엔티티 간의 관계를 생성합니다.

**파라미터:**
```typescript
{
  relations: Array<{
    from: string;          // 시작 엔티티 이름
    to: string;            // 종료 엔티티 이름
    relationType: string;  // 관계 타입 (능동태)
  }>
}
```

**예제:**
```json
{
  "relations": [
    {
      "from": "TypeScript",
      "to": "JavaScript",
      "relationType": "compiles-to"
    }
  ]
}
```

**응답:**
```json
[
  {
    "from": "TypeScript",
    "to": "JavaScript",
    "relationType": "compiles-to"
  }
]
```

### 3. add_observations

기존 엔티티에 관찰 내용을 추가합니다.

**파라미터:**
```typescript
{
  observations: Array<{
    entityName: string;  // 엔티티 이름
    contents: string[];  // 추가할 관찰 내용
  }>
}
```

**예제:**
```json
{
  "observations": [
    {
      "entityName": "TypeScript",
      "contents": [
        "Microsoft에서 개발했습니다",
        "2012년에 처음 출시되었습니다"
      ]
    }
  ]
}
```

### 4. delete_entities

엔티티와 관련된 모든 관계를 삭제합니다.

**파라미터:**
```typescript
{
  entityNames: string[]  // 삭제할 엔티티 이름 배열
}
```

**예제:**
```json
{
  "entityNames": ["TypeScript"]
}
```

### 5. delete_observations

엔티티에서 특정 관찰 내용을 삭제합니다.

**파라미터:**
```typescript
{
  deletions: Array<{
    entityName: string;     // 엔티티 이름
    observations: string[]; // 삭제할 관찰 내용
  }>
}
```

**예제:**
```json
{
  "deletions": [
    {
      "entityName": "TypeScript",
      "observations": ["2012년에 처음 출시되었습니다"]
    }
  ]
}
```

### 6. delete_relations

특정 관계를 삭제합니다.

**파라미터:**
```typescript
{
  relations: Array<{
    from: string;
    to: string;
    relationType: string;
  }>
}
```

**예제:**
```json
{
  "relations": [
    {
      "from": "TypeScript",
      "to": "JavaScript",
      "relationType": "compiles-to"
    }
  ]
}
```

### 7. read_graph

전체 지식 그래프를 조회합니다.

**파라미터:** 없음

**응답:**
```json
{
  "entities": [
    {
      "name": "TypeScript",
      "entityType": "programming-language",
      "observations": ["정적 타입 시스템을 제공합니다"]
    }
  ],
  "relations": [
    {
      "from": "TypeScript",
      "to": "JavaScript",
      "relationType": "compiles-to"
    }
  ]
}
```

### 8. search_nodes

이름, 타입, 관찰 내용으로 엔티티를 검색합니다.

**파라미터:**
```typescript
{
  query: string  // 검색 쿼리 문자열
}
```

**예제:**
```json
{
  "query": "typescript"
}
```

**응답:**
```json
[
  {
    "name": "TypeScript",
    "entityType": "programming-language",
    "observations": ["정적 타입 시스템을 제공합니다"]
  }
]
```

### 9. open_nodes

특정 엔티티를 이름으로 조회합니다.

**파라미터:**
```typescript
{
  names: string[]  // 조회할 엔티티 이름 배열
}
```

**예제:**
```json
{
  "names": ["TypeScript", "JavaScript"]
}
```

**응답:**
```json
[
  {
    "name": "TypeScript",
    "entityType": "programming-language",
    "observations": ["정적 타입 시스템을 제공합니다"]
  },
  {
    "name": "JavaScript",
    "entityType": "programming-language",
    "observations": ["동적 타입 언어입니다"]
  }
]
```

## 에러 처리

모든 에러는 영문 메시지와 한국어 설명을 함께 제공합니다:

```
Error: Entity with name "TypeScript" already exists
"TypeScript" 이름을 가진 엔티티가 이미 존재합니다
```

### 주요 에러 유형

- **중복 엔티티**: 동일한 이름의 엔티티가 이미 존재
- **엔티티 없음**: 참조하는 엔티티를 찾을 수 없음
- **잘못된 파라미터**: 필수 파라미터 누락 또는 타입 불일치
- **파일 시스템 에러**: 저장 파일 읽기/쓰기 실패

## 개발

### 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 테스트 watch 모드
npm run test:watch
```

### 프로젝트 구조

```
src/
├── types.ts                    # 타입 정의
├── graph-storage.ts            # 저장소 계층
├── knowledge-graph-manager.ts  # 비즈니스 로직
├── mcp-server.ts              # MCP 서버 구현
└── bin/
    └── index.ts               # CLI 진입점

tests/
├── unit/                      # 단위 테스트
├── property/                  # 속성 기반 테스트
└── integration/               # 통합 테스트
```

### 테스트 전략

프로젝트는 이중 테스트 접근법을 사용합니다:

- **단위 테스트**: 특정 예제와 엣지 케이스 검증
- **속성 기반 테스트**: fast-check를 사용한 보편적 속성 검증

## 라이선스

MIT

## 기여

이슈와 풀 리퀘스트를 환영합니다.
