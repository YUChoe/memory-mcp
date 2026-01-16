# API 문서

Knowledge Graph MCP Server는 9개의 MCP 도구를 제공합니다. 각 도구는 JSON 형식의 파라미터를 받아 작업을 수행하고 결과를 반환합니다.

## 목차

1. [create_entities](#create_entities)
2. [create_relations](#create_relations)
3. [add_observations](#add_observations)
4. [delete_entities](#delete_entities)
5. [delete_observations](#delete_observations)
6. [delete_relations](#delete_relations)
7. [read_graph](#read_graph)
8. [search_nodes](#search_nodes)
9. [open_nodes](#open_nodes)

---

## create_entities

새로운 엔티티를 지식 그래프에 생성합니다.

### 파라미터

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| entities | Array | ✓ | 생성할 엔티티 배열 |
| entities[].name | string | ✓ | 엔티티의 고유 이름 |
| entities[].entityType | string | ✓ | 엔티티 타입 |
| entities[].observations | string[] | ✓ | 초기 관찰 내용 배열 |

### 동작

- 각 엔티티는 고유한 이름을 가져야 합니다
- 중복된 이름의 엔티티 생성 시 에러 반환
- 모든 엔티티가 원자적으로 생성됩니다 (하나라도 실패하면 전체 롤백)

### 예제

**요청:**
```json
{
  "entities": [
    {
      "name": "React",
      "entityType": "library",
      "observations": [
        "UI 라이브러리입니다",
        "컴포넌트 기반 아키텍처를 사용합니다"
      ]
    },
    {
      "name": "Next.js",
      "entityType": "framework",
      "observations": [
        "React 기반 프레임워크입니다",
        "서버 사이드 렌더링을 지원합니다"
      ]
    }
  ]
}
```

**성공 응답:**
```json
[
  {
    "name": "React",
    "entityType": "library",
    "observations": [
      "UI 라이브러리입니다",
      "컴포넌트 기반 아키텍처를 사용합니다"
    ]
  },
  {
    "name": "Next.js",
    "entityType": "framework",
    "observations": [
      "React 기반 프레임워크입니다",
      "서버 사이드 렌더링을 지원합니다"
    ]
  }
]
```

**에러 응답:**
```
Error: Entity with name "React" already exists
"React" 이름을 가진 엔티티가 이미 존재합니다
```

---

## create_relations

엔티티 간의 관계를 생성합니다.

### 파라미터

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| relations | Array | ✓ | 생성할 관계 배열 |
| relations[].from | string | ✓ | 시작 엔티티 이름 |
| relations[].to | string | ✓ | 종료 엔티티 이름 |
| relations[].relationType | string | ✓ | 관계 타입 (능동태) |

### 동작

- 관계의 시작과 종료 엔티티가 모두 존재해야 합니다
- 존재하지 않는 엔티티 참조 시 에러 반환
- 관계 타입은 능동태로 표현합니다 (예: "uses", "depends-on")

### 예제

**요청:**
```json
{
  "relations": [
    {
      "from": "Next.js",
      "to": "React",
      "relationType": "built-on"
    },
    {
      "from": "Next.js",
      "to": "Node.js",
      "relationType": "runs-on"
    }
  ]
}
```

**성공 응답:**
```json
[
  {
    "from": "Next.js",
    "to": "React",
    "relationType": "built-on"
  },
  {
    "from": "Next.js",
    "to": "Node.js",
    "relationType": "runs-on"
  }
]
```

**에러 응답:**
```
Error: Entities not found: ["Node.js"]
다음 엔티티를 찾을 수 없습니다: ["Node.js"]
```

---

## add_observations

기존 엔티티에 관찰 내용을 추가합니다.

### 파라미터

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| observations | Array | ✓ | 추가할 관찰 내용 배열 |
| observations[].entityName | string | ✓ | 엔티티 이름 |
| observations[].contents | string[] | ✓ | 추가할 관찰 내용 |

### 동작

- 엔티티가 존재해야 합니다
- 새로운 관찰 내용이 기존 관찰 목록에 추가됩니다
- 중복된 관찰 내용도 추가됩니다 (중복 제거 없음)

### 예제

**요청:**
```json
{
  "observations": [
    {
      "entityName": "React",
      "contents": [
        "Facebook에서 개발했습니다",
        "가상 DOM을 사용합니다"
      ]
    }
  ]
}
```

**성공 응답:**
```json
{}
```

**에러 응답:**
```
Error: Entities not found: ["React"]
다음 엔티티를 찾을 수 없습니다: ["React"]
```

---

## delete_entities

엔티티와 관련된 모든 관계를 삭제합니다.

### 파라미터

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| entityNames | string[] | ✓ | 삭제할 엔티티 이름 배열 |

### 동작

- 지정된 엔티티를 삭제합니다
- 해당 엔티티와 연결된 모든 관계도 자동으로 삭제됩니다 (연쇄 삭제)
- 존재하지 않는 엔티티를 삭제해도 에러가 발생하지 않습니다

### 예제

**요청:**
```json
{
  "entityNames": ["React", "Next.js"]
}
```

**성공 응답:**
```json
{}
```

---

## delete_observations

엔티티에서 특정 관찰 내용을 삭제합니다.

### 파라미터

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| deletions | Array | ✓ | 삭제할 관찰 내용 배열 |
| deletions[].entityName | string | ✓ | 엔티티 이름 |
| deletions[].observations | string[] | ✓ | 삭제할 관찰 내용 |

### 동작

- 엔티티가 존재해야 합니다
- 지정된 관찰 내용만 삭제됩니다
- 존재하지 않는 관찰 내용을 삭제해도 에러가 발생하지 않습니다

### 예제

**요청:**
```json
{
  "deletions": [
    {
      "entityName": "React",
      "observations": ["가상 DOM을 사용합니다"]
    }
  ]
}
```

**성공 응답:**
```json
{}
```

**에러 응답:**
```
Error: Entities not found: ["React"]
다음 엔티티를 찾을 수 없습니다: ["React"]
```

---

## delete_relations

특정 관계를 삭제합니다.

### 파라미터

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| relations | Array | ✓ | 삭제할 관계 배열 |
| relations[].from | string | ✓ | 시작 엔티티 이름 |
| relations[].to | string | ✓ | 종료 엔티티 이름 |
| relations[].relationType | string | ✓ | 관계 타입 |

### 동작

- 지정된 관계만 삭제됩니다
- 세 필드(from, to, relationType)가 모두 일치하는 관계만 삭제됩니다
- 존재하지 않는 관계를 삭제해도 에러가 발생하지 않습니다

### 예제

**요청:**
```json
{
  "relations": [
    {
      "from": "Next.js",
      "to": "React",
      "relationType": "built-on"
    }
  ]
}
```

**성공 응답:**
```json
{}
```

---

## read_graph

전체 지식 그래프를 조회합니다.

### 파라미터

없음

### 동작

- 모든 엔티티와 관계를 반환합니다
- 빈 그래프인 경우 빈 배열을 반환합니다

### 예제

**요청:**
```json
{}
```

**성공 응답:**
```json
{
  "entities": [
    {
      "name": "React",
      "entityType": "library",
      "observations": [
        "UI 라이브러리입니다",
        "컴포넌트 기반 아키텍처를 사용합니다"
      ]
    },
    {
      "name": "Next.js",
      "entityType": "framework",
      "observations": [
        "React 기반 프레임워크입니다"
      ]
    }
  ],
  "relations": [
    {
      "from": "Next.js",
      "to": "React",
      "relationType": "built-on"
    }
  ]
}
```

---

## search_nodes

이름, 타입, 관찰 내용으로 엔티티를 검색합니다.

### 파라미터

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| query | string | ✓ | 검색 쿼리 문자열 |

### 동작

- 대소문자를 구분하지 않습니다
- 엔티티의 이름, 타입, 관찰 내용에서 부분 일치를 검색합니다
- 일치하는 모든 엔티티를 반환합니다
- 일치하는 엔티티가 없으면 빈 배열을 반환합니다

### 예제

**요청:**
```json
{
  "query": "react"
}
```

**성공 응답:**
```json
[
  {
    "name": "React",
    "entityType": "library",
    "observations": [
      "UI 라이브러리입니다"
    ]
  },
  {
    "name": "Next.js",
    "entityType": "framework",
    "observations": [
      "React 기반 프레임워크입니다"
    ]
  }
]
```

---

## open_nodes

특정 엔티티를 이름으로 조회합니다.

### 파라미터

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| names | string[] | ✓ | 조회할 엔티티 이름 배열 |

### 동작

- 지정된 이름의 엔티티를 반환합니다
- 하나라도 존재하지 않으면 에러를 반환합니다
- 모든 엔티티가 존재해야 성공합니다

### 예제

**요청:**
```json
{
  "names": ["React", "Next.js"]
}
```

**성공 응답:**
```json
[
  {
    "name": "React",
    "entityType": "library",
    "observations": [
      "UI 라이브러리입니다"
    ]
  },
  {
    "name": "Next.js",
    "entityType": "framework",
    "observations": [
      "React 기반 프레임워크입니다"
    ]
  }
]
```

**에러 응답:**
```
Error: Entities not found: ["Vue.js"]
다음 엔티티를 찾을 수 없습니다: ["Vue.js"]
```

---

## 에러 처리

모든 에러는 다음 형식으로 반환됩니다:

```
Error: <영문 에러 메시지>
<한국어 설명>
```

### 일반적인 에러 유형

1. **중복 엔티티**
   ```
   Error: Entity with name "EntityName" already exists
   "EntityName" 이름을 가진 엔티티가 이미 존재합니다
   ```

2. **엔티티 없음**
   ```
   Error: Entities not found: ["Entity1", "Entity2"]
   다음 엔티티를 찾을 수 없습니다: ["Entity1", "Entity2"]
   ```

3. **잘못된 파라미터**
   ```
   Error: Invalid arguments: entities array is required
   잘못된 인자: entities 배열이 필요합니다
   ```

4. **빈 배열**
   ```
   Error: Invalid arguments: entities array cannot be empty
   잘못된 인자: entities 배열은 비어있을 수 없습니다
   ```

5. **파일 시스템 에러**
   ```
   Error: Failed to parse storage file: Invalid JSON
   저장 파일을 읽을 수 없습니다: 잘못된 JSON 형식
   ```
