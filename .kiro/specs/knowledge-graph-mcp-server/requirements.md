# Requirements Document

## Introduction

Knowledge Graph MCP Server는 엔티티와 관계를 영구적으로 저장하고 관리하는 MCP(Model Context Protocol) 서버입니다. 이 시스템은 지식 그래프를 통해 엔티티 간의 관계를 추적하고, 시간에 따른 관찰 내용을 기록하며, 강력한 검색 기능을 제공합니다.

## Glossary

- **Knowledge_Graph_Server**: MCP 프로토콜을 구현하는 지식 그래프 관리 서버
- **Entity**: 지식 그래프 내의 노드로, 이름, 타입, 관찰 내용을 포함
- **Relation**: 두 엔티티 간의 방향성 있는 관계 (능동태로 표현)
- **Observation**: 특정 엔티티에 대한 시간별 관찰 기록
- **Graph_Storage**: JSON 형식으로 그래프 데이터를 영구 저장하는 저장소
- **MCP_Tool**: MCP 프로토콜에서 정의된 실행 가능한 도구

## Requirements

### Requirement 1: Entity Management

**User Story:** As a user, I want to create and manage entities in the knowledge graph, so that I can build a structured representation of information.

#### Acceptance Criteria

1. WHEN a user creates entities with name, type, and observations, THE Knowledge_Graph_Server SHALL add them to the graph
2. WHEN a user requests to open specific entities by name, THE Knowledge_Graph_Server SHALL return the complete entity information
3. WHEN a user deletes entities, THE Knowledge_Graph_Server SHALL remove them and all associated relations
4. WHEN multiple entities are created in a single request, THE Knowledge_Graph_Server SHALL process all entities atomically
5. WHEN an entity with a duplicate name is created, THE Knowledge_Graph_Server SHALL reject the creation and return an error

### Requirement 2: Relation Management

**User Story:** As a user, I want to define relationships between entities, so that I can represent how different pieces of information connect.

#### Acceptance Criteria

1. WHEN a user creates a relation between two entities, THE Knowledge_Graph_Server SHALL store the relation with source, target, and relation type
2. WHEN a relation is created with a non-existent entity, THE Knowledge_Graph_Server SHALL reject the creation and return an error
3. WHEN a user deletes a relation, THE Knowledge_Graph_Server SHALL remove only that specific relation
4. WHEN an entity is deleted, THE Knowledge_Graph_Server SHALL automatically delete all relations involving that entity
5. THE Knowledge_Graph_Server SHALL store relation types in active voice format

### Requirement 3: Observation System

**User Story:** As a user, I want to add and remove observations about entities, so that I can track information changes over time.

#### Acceptance Criteria

1. WHEN a user adds observations to an entity, THE Knowledge_Graph_Server SHALL append them to the entity's observation list
2. WHEN a user deletes specific observations from an entity, THE Knowledge_Graph_Server SHALL remove only those observations
3. WHEN observations are added to a non-existent entity, THE Knowledge_Graph_Server SHALL reject the operation and return an error
4. WHEN multiple observations are added in a single request, THE Knowledge_Graph_Server SHALL process all observations atomically

### Requirement 4: Graph Reading and Search

**User Story:** As a user, I want to read and search the knowledge graph, so that I can retrieve relevant information efficiently.

#### Acceptance Criteria

1. WHEN a user requests to read the graph, THE Knowledge_Graph_Server SHALL return all entities and relations
2. WHEN a user searches with a query string, THE Knowledge_Graph_Server SHALL return entities matching the query in name, type, or observations
3. WHEN a search query matches multiple entities, THE Knowledge_Graph_Server SHALL return all matching entities
4. WHEN a search query matches no entities, THE Knowledge_Graph_Server SHALL return an empty result set

### Requirement 5: Data Persistence

**User Story:** As a user, I want my knowledge graph data to persist between sessions, so that I don't lose my work.

#### Acceptance Criteria

1. WHEN the Knowledge_Graph_Server starts, THE Graph_Storage SHALL load existing data from the JSON file
2. WHEN any modification occurs, THE Graph_Storage SHALL save the updated graph to the JSON file
3. WHEN the JSON file does not exist on startup, THE Graph_Storage SHALL create a new empty graph
4. WHEN the JSON file is corrupted, THE Graph_Storage SHALL handle the error gracefully and notify the user
5. THE Graph_Storage SHALL encode graph data using JSON format
6. WHEN a storage path is provided, THE Graph_Storage SHALL store the graph file in the .kiro directory of the specified project path
7. WHEN no storage path is provided, THE Graph_Storage SHALL use a default location in the user's home directory

### Requirement 6: MCP Protocol Compliance

**User Story:** As a developer, I want the server to comply with MCP protocol specifications, so that it can integrate with MCP clients.

#### Acceptance Criteria

1. THE Knowledge_Graph_Server SHALL implement the MCP server protocol specification
2. THE Knowledge_Graph_Server SHALL expose nine MCP tools: create_entities, create_relations, add_observations, delete_entities, delete_observations, delete_relations, read_graph, search_nodes, open_nodes
3. WHEN a tool is invoked with valid parameters, THE Knowledge_Graph_Server SHALL execute the operation and return the result
4. WHEN a tool is invoked with invalid parameters, THE Knowledge_Graph_Server SHALL return a descriptive error message
5. THE Knowledge_Graph_Server SHALL be executable via npx command

### Requirement 7: Concurrent Operation Safety

**User Story:** As a system administrator, I want the server to handle concurrent operations safely, so that data integrity is maintained.

#### Acceptance Criteria

1. WHEN multiple operations are executed concurrently, THE Knowledge_Graph_Server SHALL ensure data consistency
2. WHEN a write operation is in progress, THE Knowledge_Graph_Server SHALL prevent data corruption from concurrent writes
3. WHEN read operations occur during writes, THE Knowledge_Graph_Server SHALL return consistent data

### Requirement 8: Error Handling

**User Story:** As a user, I want clear error messages when operations fail, so that I can understand and fix issues.

#### Acceptance Criteria

1. WHEN an operation fails due to invalid input, THE Knowledge_Graph_Server SHALL return a descriptive error message
2. WHEN an operation fails due to missing entities, THE Knowledge_Graph_Server SHALL specify which entities were not found
3. WHEN a file system error occurs, THE Knowledge_Graph_Server SHALL log the error and return a user-friendly message
4. THE Knowledge_Graph_Server SHALL maintain original error messages but provide explanations in Korean
