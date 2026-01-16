# 사용 예제

이 문서는 Knowledge Graph MCP Server의 실제 사용 예제를 제공합니다.

## 목차

1. [기본 워크플로우](#기본-워크플로우)
2. [프로그래밍 언어 지식 그래프](#프로그래밍-언어-지식-그래프)
3. [프로젝트 의존성 추적](#프로젝트-의존성-추적)
4. [학습 노트 관리](#학습-노트-관리)
5. [팀 구조 관리](#팀-구조-관리)

---

## 기본 워크플로우

### 1. 엔티티 생성

먼저 몇 개의 엔티티를 생성합니다:

```json
{
  "tool": "create_entities",
  "arguments": {
    "entities": [
      {
        "name": "Alice",
        "entityType": "person",
        "observations": ["소프트웨어 엔지니어", "TypeScript 전문가"]
      },
      {
        "name": "Bob",
        "entityType": "person",
        "observations": ["프로덕트 매니저", "5년 경력"]
      }
    ]
  }
}
```

### 2. 관계 생성

엔티티 간의 관계를 정의합니다:

```json
{
  "tool": "create_relations",
  "arguments": {
    "relations": [
      {
        "from": "Alice",
        "to": "Bob",
        "relationType": "works-with"
      }
    ]
  }
}
```

### 3. 관찰 내용 추가

나중에 추가 정보를 기록합니다:

```json
{
  "tool": "add_observations",
  "arguments": {
    "observations": [
      {
        "entityName": "Alice",
        "contents": ["React 프로젝트 리드", "2024년 1월 입사"]
      }
    ]
  }
}
```

### 4. 검색

특정 정보를 찾습니다:

```json
{
  "tool": "search_nodes",
  "arguments": {
    "query": "typescript"
  }
}
```

결과:
```json
[
  {
    "name": "Alice",
    "entityType": "person",
    "observations": [
      "소프트웨어 엔지니어",
      "TypeScript 전문가",
      "React 프로젝트 리드",
      "2024년 1월 입사"
    ]
  }
]
```

### 5. 전체 그래프 조회

```json
{
  "tool": "read_graph",
  "arguments": {}
}
```

---

## 프로그래밍 언어 지식 그래프

프로그래밍 언어와 그 관계를 추적하는 예제입니다.

### 엔티티 생성

```json
{
  "tool": "create_entities",
  "arguments": {
    "entities": [
      {
        "name": "JavaScript",
        "entityType": "programming-language",
        "observations": [
          "동적 타입 언어",
          "웹 브라우저에서 실행",
          "1995년 Brendan Eich가 개발"
        ]
      },
      {
        "name": "TypeScript",
        "entityType": "programming-language",
        "observations": [
          "정적 타입 시스템",
          "JavaScript의 상위 집합",
          "Microsoft에서 개발"
        ]
      },
      {
        "name": "Python",
        "entityType": "programming-language",
        "observations": [
          "동적 타입 언어",
          "간결한 문법",
          "데이터 과학에 널리 사용"
        ]
      },
      {
        "name": "Rust",
        "entityType": "programming-language",
        "observations": [
          "시스템 프로그래밍 언어",
          "메모리 안전성 보장",
          "소유권 시스템"
        ]
      }
    ]
  }
}
```

### 관계 생성

```json
{
  "tool": "create_relations",
  "arguments": {
    "relations": [
      {
        "from": "TypeScript",
        "to": "JavaScript",
        "relationType": "compiles-to"
      },
      {
        "from": "TypeScript",
        "to": "JavaScript",
        "relationType": "extends"
      }
    ]
  }
}
```

### 특정 언어 조회

```json
{
  "tool": "open_nodes",
  "arguments": {
    "names": ["TypeScript"]
  }
}
```

---

## 프로젝트 의존성 추적

소프트웨어 프로젝트의 의존성을 관리하는 예제입니다.

### 프로젝트와 라이브러리 생성

```json
{
  "tool": "create_entities",
  "arguments": {
    "entities": [
      {
        "name": "my-web-app",
        "entityType": "project",
        "observations": [
          "웹 애플리케이션",
          "2024년 1월 시작",
          "프로덕션 환경"
        ]
      },
      {
        "name": "react",
        "entityType": "library",
        "observations": [
          "UI 라이브러리",
          "버전 18.2.0",
          "MIT 라이선스"
        ]
      },
      {
        "name": "next.js",
        "entityType": "framework",
        "observations": [
          "React 프레임워크",
          "버전 14.0.0",
          "서버 사이드 렌더링"
        ]
      },
      {
        "name": "tailwindcss",
        "entityType": "library",
        "observations": [
          "CSS 프레임워크",
          "버전 3.4.0",
          "유틸리티 우선"
        ]
      }
    ]
  }
}
```

### 의존성 관계 생성

```json
{
  "tool": "create_relations",
  "arguments": {
    "relations": [
      {
        "from": "my-web-app",
        "to": "next.js",
        "relationType": "uses"
      },
      {
        "from": "my-web-app",
        "to": "tailwindcss",
        "relationType": "uses"
      },
      {
        "from": "next.js",
        "to": "react",
        "relationType": "depends-on"
      }
    ]
  }
}
```

### 버전 업데이트 기록

```json
{
  "tool": "add_observations",
  "arguments": {
    "observations": [
      {
        "entityName": "react",
        "contents": [
          "2024-02-15: 버전 18.2.0에서 18.3.0으로 업데이트",
          "새로운 훅 추가됨"
        ]
      }
    ]
  }
}
```

### 특정 라이브러리를 사용하는 프로젝트 찾기

```json
{
  "tool": "read_graph",
  "arguments": {}
}
```

그래프를 읽은 후 클라이언트 측에서 관계를 필터링하여 "react"를 사용하는 모든 프로젝트를 찾을 수 있습니다.

---

## 학습 노트 관리

학습 내용과 개념 간의 관계를 추적하는 예제입니다.

### 개념 생성

```json
{
  "tool": "create_entities",
  "arguments": {
    "entities": [
      {
        "name": "REST API",
        "entityType": "concept",
        "observations": [
          "Representational State Transfer",
          "HTTP 메서드 사용 (GET, POST, PUT, DELETE)",
          "무상태 통신"
        ]
      },
      {
        "name": "GraphQL",
        "entityType": "concept",
        "observations": [
          "쿼리 언어",
          "단일 엔드포인트",
          "클라이언트가 필요한 데이터만 요청"
        ]
      },
      {
        "name": "API Design",
        "entityType": "topic",
        "observations": [
          "소프트웨어 인터페이스 설계",
          "사용성과 확장성 고려"
        ]
      }
    ]
  }
}
```

### 개념 간 관계

```json
{
  "tool": "create_relations",
  "arguments": {
    "relations": [
      {
        "from": "REST API",
        "to": "API Design",
        "relationType": "is-part-of"
      },
      {
        "from": "GraphQL",
        "to": "API Design",
        "relationType": "is-part-of"
      },
      {
        "from": "GraphQL",
        "to": "REST API",
        "relationType": "alternative-to"
      }
    ]
  }
}
```

### 학습 진행 상황 추가

```json
{
  "tool": "add_observations",
  "arguments": {
    "observations": [
      {
        "entityName": "REST API",
        "contents": [
          "2024-01-15: 기본 개념 학습 완료",
          "2024-01-20: Express.js로 REST API 구현 실습",
          "2024-01-25: 인증 및 권한 부여 학습"
        ]
      },
      {
        "entityName": "GraphQL",
        "contents": [
          "2024-02-01: GraphQL 기본 문법 학습 시작",
          "2024-02-05: Apollo Server 실습"
        ]
      }
    ]
  }
}
```

### 특정 주제 검색

```json
{
  "tool": "search_nodes",
  "arguments": {
    "query": "API"
  }
}
```

---

## 팀 구조 관리

조직의 팀 구조와 역할을 추적하는 예제입니다.

### 팀과 구성원 생성

```json
{
  "tool": "create_entities",
  "arguments": {
    "entities": [
      {
        "name": "Engineering Team",
        "entityType": "team",
        "observations": [
          "소프트웨어 개발 팀",
          "15명 구성",
          "서울 본사"
        ]
      },
      {
        "name": "Frontend Squad",
        "entityType": "squad",
        "observations": [
          "프론트엔드 개발",
          "5명 구성",
          "React 기반"
        ]
      },
      {
        "name": "Backend Squad",
        "entityType": "squad",
        "observations": [
          "백엔드 개발",
          "7명 구성",
          "Node.js 및 Python"
        ]
      },
      {
        "name": "Alice Kim",
        "entityType": "person",
        "observations": [
          "시니어 프론트엔드 개발자",
          "5년 경력",
          "React 전문가"
        ]
      },
      {
        "name": "Bob Lee",
        "entityType": "person",
        "observations": [
          "백엔드 개발자",
          "3년 경력",
          "Node.js 전문가"
        ]
      },
      {
        "name": "Carol Park",
        "entityType": "person",
        "observations": [
          "엔지니어링 매니저",
          "10년 경력",
          "팀 리더십"
        ]
      }
    ]
  }
}
```

### 조직 구조 관계

```json
{
  "tool": "create_relations",
  "arguments": {
    "relations": [
      {
        "from": "Frontend Squad",
        "to": "Engineering Team",
        "relationType": "part-of"
      },
      {
        "from": "Backend Squad",
        "to": "Engineering Team",
        "relationType": "part-of"
      },
      {
        "from": "Alice Kim",
        "to": "Frontend Squad",
        "relationType": "member-of"
      },
      {
        "from": "Bob Lee",
        "to": "Backend Squad",
        "relationType": "member-of"
      },
      {
        "from": "Carol Park",
        "to": "Engineering Team",
        "relationType": "manages"
      },
      {
        "from": "Alice Kim",
        "to": "Bob Lee",
        "relationType": "collaborates-with"
      }
    ]
  }
}
```

### 역할 변경 기록

```json
{
  "tool": "add_observations",
  "arguments": {
    "observations": [
      {
        "entityName": "Alice Kim",
        "contents": [
          "2024-03-01: 테크 리드로 승진",
          "프론트엔드 아키텍처 담당"
        ]
      }
    ]
  }
}
```

### 특정 팀 구성원 조회

```json
{
  "tool": "search_nodes",
  "arguments": {
    "query": "Frontend Squad"
  }
}
```

### 팀원 퇴사 처리

```json
{
  "tool": "delete_entities",
  "arguments": {
    "entityNames": ["Bob Lee"]
  }
}
```

이 작업은 Bob Lee 엔티티와 그와 관련된 모든 관계를 자동으로 삭제합니다.

---

## 고급 패턴

### 1. 시간별 변경 추적

관찰 내용에 타임스탬프를 포함하여 변경 이력을 추적할 수 있습니다:

```json
{
  "tool": "add_observations",
  "arguments": {
    "observations": [
      {
        "entityName": "my-project",
        "contents": [
          "[2024-01-15] 프로젝트 시작",
          "[2024-02-01] 알파 버전 출시",
          "[2024-03-15] 베타 버전 출시"
        ]
      }
    ]
  }
}
```

### 2. 태그 시스템

엔티티 타입을 태그처럼 사용할 수 있습니다:

```json
{
  "tool": "create_entities",
  "arguments": {
    "entities": [
      {
        "name": "Feature-123",
        "entityType": "feature:in-progress:high-priority",
        "observations": ["사용자 인증 기능", "2024-Q1 목표"]
      }
    ]
  }
}
```

### 3. 계층 구조

관계를 사용하여 계층 구조를 표현할 수 있습니다:

```json
{
  "tool": "create_relations",
  "arguments": {
    "relations": [
      {
        "from": "SubTask-1",
        "to": "Task-1",
        "relationType": "subtask-of"
      },
      {
        "from": "SubTask-2",
        "to": "Task-1",
        "relationType": "subtask-of"
      },
      {
        "from": "Task-1",
        "to": "Epic-1",
        "relationType": "part-of"
      }
    ]
  }
}
```

### 4. 양방향 관계

필요한 경우 양방향 관계를 명시적으로 생성할 수 있습니다:

```json
{
  "tool": "create_relations",
  "arguments": {
    "relations": [
      {
        "from": "Alice",
        "to": "Bob",
        "relationType": "mentors"
      },
      {
        "from": "Bob",
        "to": "Alice",
        "relationType": "mentored-by"
      }
    ]
  }
}
```

---

## 모범 사례

1. **명확한 이름 사용**: 엔티티 이름은 고유하고 설명적이어야 합니다
2. **일관된 타입**: 엔티티 타입은 일관된 명명 규칙을 따라야 합니다
3. **능동태 관계**: 관계 타입은 능동태로 표현합니다 (예: "uses", "depends-on")
4. **구조화된 관찰**: 관찰 내용에 날짜나 카테고리를 포함하여 구조화합니다
5. **정기적인 정리**: 더 이상 필요하지 않은 엔티티와 관계를 정기적으로 삭제합니다
