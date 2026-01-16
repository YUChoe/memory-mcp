# 빠른 시작 가이드

이 가이드는 Knowledge Graph MCP Server를 5분 안에 시작하는 방법을 안내합니다.

## 1단계: 설치

### NPM을 통한 설치

```bash
npm install -g knowledge-graph-mcp-server
```

### 또는 소스에서 빌드

```bash
git clone <repository-url>
cd knowledge-graph-mcp-server
npm install
npm run build
```

## 2단계: MCP 클라이언트 설정

### Kiro에서 설정

Kiro의 MCP 설정 파일(`.kiro/settings/mcp.json`)에 서버를 추가합니다:

```json
{
  "mcpServers": {
    "knowledge-graph": {
      "command": "npx",
      "args": ["knowledge-graph-mcp-server"],
      "env": {},
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### 프로젝트별 저장소 사용

특정 프로젝트 경로를 지정하려면:

```json
{
  "mcpServers": {
    "knowledge-graph": {
      "command": "npx",
      "args": ["knowledge-graph-mcp-server", "/path/to/your/project"],
      "env": {},
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## 3단계: 서버 시작

MCP 클라이언트를 재시작하면 서버가 자동으로 시작됩니다.

Kiro에서는:
1. 명령 팔레트 열기 (Ctrl+Shift+P 또는 Cmd+Shift+P)
2. "MCP: Reconnect Servers" 검색 및 실행

## 4단계: 첫 번째 엔티티 생성

MCP 클라이언트에서 `create_entities` 도구를 호출합니다:

```json
{
  "entities": [
    {
      "name": "My First Entity",
      "entityType": "note",
      "observations": [
        "이것은 첫 번째 엔티티입니다",
        "Knowledge Graph MCP Server 테스트"
      ]
    }
  ]
}
```

## 5단계: 그래프 확인

`read_graph` 도구를 호출하여 생성된 엔티티를 확인합니다:

```json
{}
```

응답:
```json
{
  "entities": [
    {
      "name": "My First Entity",
      "entityType": "note",
      "observations": [
        "이것은 첫 번째 엔티티입니다",
        "Knowledge Graph MCP Server 테스트"
      ]
    }
  ],
  "relations": []
}
```

## 다음 단계

축하합니다! Knowledge Graph MCP Server를 성공적으로 설정했습니다.

이제 다음을 시도해보세요:

1. **더 많은 엔티티 생성**: 여러 엔티티를 생성하여 지식 그래프를 구축합니다
2. **관계 추가**: `create_relations`를 사용하여 엔티티 간의 연결을 만듭니다
3. **검색 시도**: `search_nodes`로 특정 정보를 찾습니다
4. **관찰 추가**: `add_observations`로 엔티티에 추가 정보를 기록합니다

## 실용적인 예제

### 간단한 프로젝트 추적

```json
// 1. 프로젝트와 작업 생성
{
  "tool": "create_entities",
  "arguments": {
    "entities": [
      {
        "name": "Website Redesign",
        "entityType": "project",
        "observations": ["2024 Q1 목표", "우선순위: 높음"]
      },
      {
        "name": "Homepage Update",
        "entityType": "task",
        "observations": ["진행 중", "담당자: Alice"]
      },
      {
        "name": "Navigation Redesign",
        "entityType": "task",
        "observations": ["계획 중", "담당자: Bob"]
      }
    ]
  }
}

// 2. 작업 관계 생성
{
  "tool": "create_relations",
  "arguments": {
    "relations": [
      {
        "from": "Homepage Update",
        "to": "Website Redesign",
        "relationType": "part-of"
      },
      {
        "from": "Navigation Redesign",
        "to": "Website Redesign",
        "relationType": "part-of"
      }
    ]
  }
}

// 3. 진행 상황 업데이트
{
  "tool": "add_observations",
  "arguments": {
    "observations": [
      {
        "entityName": "Homepage Update",
        "contents": ["2024-01-15: 디자인 완료", "2024-01-20: 개발 시작"]
      }
    ]
  }
}

// 4. 프로젝트 검색
{
  "tool": "search_nodes",
  "arguments": {
    "query": "Website Redesign"
  }
}
```

## 문제 해결

### 서버가 시작되지 않음

1. Node.js가 설치되어 있는지 확인 (버전 18 이상 권장)
2. MCP 설정 파일의 경로가 올바른지 확인
3. MCP 클라이언트 로그 확인

### 데이터가 저장되지 않음

1. 저장 경로에 쓰기 권한이 있는지 확인
2. 디스크 공간이 충분한지 확인
3. JSON 파일이 손상되지 않았는지 확인

### 엔티티를 찾을 수 없음

1. 엔티티 이름의 대소문자가 정확한지 확인
2. `read_graph`로 전체 그래프를 확인
3. `search_nodes`로 부분 일치 검색 시도

## 추가 리소스

- [API 문서](./API.md) - 모든 도구의 상세 설명
- [예제 모음](./EXAMPLES.md) - 실제 사용 사례
- [README](../README.md) - 전체 프로젝트 개요

## 도움이 필요하신가요?

- GitHub Issues에 문제를 보고해주세요
- 문서를 참조하여 더 많은 정보를 확인하세요
