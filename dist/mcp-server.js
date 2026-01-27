/**
 * MCP 서버 구현
 * 9개의 도구를 등록하고 MCP 프로토콜을 구현합니다.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { KnowledgeGraphManager } from './knowledge-graph-manager.js';
import { GraphStorage } from './graph-storage.js';
export class MCPServer {
    server;
    manager;
    constructor(storagePath) {
        this.server = new Server({
            name: 'knowledge-graph-mcp-server',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        const storage = new GraphStorage(storagePath);
        this.manager = new KnowledgeGraphManager(storage);
    }
    /**
     * 서버 초기화 및 시작
     */
    async start() {
        // 저장소에서 그래프 로드
        await this.manager.loadFromStorage();
        // 도구 등록
        this.registerTools();
        // 도구 핸들러 등록
        this.registerHandlers();
        // 전송 계층 설정
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Knowledge Graph MCP Server started successfully');
    }
    /**
     * 9개의 MCP 도구 등록
     */
    registerTools() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            const tools = [
                // 1. create_entities
                {
                    name: 'create_entities',
                    description: 'Create new entities in the knowledge graph',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            entities: {
                                type: 'array',
                                description: 'Array of entities to create',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: {
                                            type: 'string',
                                            description: 'Unique name of the entity',
                                        },
                                        entityType: {
                                            type: 'string',
                                            description: 'Type of the entity',
                                        },
                                        observations: {
                                            type: 'array',
                                            description: 'Initial observations about the entity',
                                            items: {
                                                type: 'string',
                                            },
                                        },
                                    },
                                    required: ['name', 'entityType', 'observations'],
                                },
                            },
                        },
                        required: ['entities'],
                    },
                },
                // 2. create_relations
                {
                    name: 'create_relations',
                    description: 'Create relations between entities in the knowledge graph',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            relations: {
                                type: 'array',
                                description: 'Array of relations to create',
                                items: {
                                    type: 'object',
                                    properties: {
                                        from: {
                                            type: 'string',
                                            description: 'Source entity name',
                                        },
                                        to: {
                                            type: 'string',
                                            description: 'Target entity name',
                                        },
                                        relationType: {
                                            type: 'string',
                                            description: 'Type of relation in active voice',
                                        },
                                    },
                                    required: ['from', 'to', 'relationType'],
                                },
                            },
                        },
                        required: ['relations'],
                    },
                },
                // 3. add_observations
                {
                    name: 'add_observations',
                    description: 'Add observations to existing entities',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            observations: {
                                type: 'array',
                                description: 'Array of observations to add',
                                items: {
                                    type: 'object',
                                    properties: {
                                        entityName: {
                                            type: 'string',
                                            description: 'Name of the entity to add observations to',
                                        },
                                        contents: {
                                            type: 'array',
                                            description: 'Observation contents to add',
                                            items: {
                                                type: 'string',
                                            },
                                        },
                                    },
                                    required: ['entityName', 'contents'],
                                },
                            },
                        },
                        required: ['observations'],
                    },
                },
                // 4. delete_entities
                {
                    name: 'delete_entities',
                    description: 'Delete entities and their associated relations from the knowledge graph',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            entityNames: {
                                type: 'array',
                                description: 'Array of entity names to delete',
                                items: {
                                    type: 'string',
                                },
                            },
                        },
                        required: ['entityNames'],
                    },
                },
                // 5. delete_observations
                {
                    name: 'delete_observations',
                    description: 'Delete specific observations from entities',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            deletions: {
                                type: 'array',
                                description: 'Array of observation deletions',
                                items: {
                                    type: 'object',
                                    properties: {
                                        entityName: {
                                            type: 'string',
                                            description: 'Name of the entity to delete observations from',
                                        },
                                        observations: {
                                            type: 'array',
                                            description: 'Observation contents to delete',
                                            items: {
                                                type: 'string',
                                            },
                                        },
                                    },
                                    required: ['entityName', 'observations'],
                                },
                            },
                        },
                        required: ['deletions'],
                    },
                },
                // 6. delete_relations
                {
                    name: 'delete_relations',
                    description: 'Delete specific relations from the knowledge graph',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            relations: {
                                type: 'array',
                                description: 'Array of relations to delete',
                                items: {
                                    type: 'object',
                                    properties: {
                                        from: {
                                            type: 'string',
                                            description: 'Source entity name',
                                        },
                                        to: {
                                            type: 'string',
                                            description: 'Target entity name',
                                        },
                                        relationType: {
                                            type: 'string',
                                            description: 'Type of relation',
                                        },
                                    },
                                    required: ['from', 'to', 'relationType'],
                                },
                            },
                        },
                        required: ['relations'],
                    },
                },
                // 7. read_graph
                {
                    name: 'read_graph',
                    description: 'Read the entire knowledge graph with all entities and relations',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                    },
                },
                // 8. search_nodes
                {
                    name: 'search_nodes',
                    description: 'Search for entities by name, type, or observations',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'Search query string',
                            },
                        },
                        required: ['query'],
                    },
                },
                // 9. open_nodes
                {
                    name: 'open_nodes',
                    description: 'Open and retrieve specific entities by their names',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            names: {
                                type: 'array',
                                description: 'Array of entity names to retrieve',
                                items: {
                                    type: 'string',
                                },
                            },
                        },
                        required: ['names'],
                    },
                },
            ];
            return { tools };
        });
    }
    /**
     * 도구 핸들러 등록
     */
    registerHandlers() {
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'create_entities':
                        return await this.handleCreateEntities(args);
                    case 'create_relations':
                        return await this.handleCreateRelations(args);
                    case 'add_observations':
                        return await this.handleAddObservations(args);
                    case 'delete_entities':
                        return await this.handleDeleteEntities(args);
                    case 'delete_observations':
                        return await this.handleDeleteObservations(args);
                    case 'delete_relations':
                        return await this.handleDeleteRelations(args);
                    case 'read_graph':
                        return await this.handleReadGraph(args);
                    case 'search_nodes':
                        return await this.handleSearchNodes(args);
                    case 'open_nodes':
                        return await this.handleOpenNodes(args);
                    default:
                        return this.formatErrorWithKo(`Unknown tool: ${name}`, `알 수 없는 도구: ${name}`);
                }
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                return this.formatErrorWithKo(`Tool execution failed: ${errorMsg}`, `도구 실행 실패: ${errorMsg}`);
            }
        });
    }
    /**
     * create_entities 도구 핸들러
     */
    async handleCreateEntities(args) {
        if (!this.isValidArgs(args, ['entities'])) {
            return this.formatErrorWithKo('Invalid arguments: entities array is required', '잘못된 인자: entities 배열이 필요합니다');
        }
        const { entities } = args;
        if (!Array.isArray(entities)) {
            return this.formatErrorWithKo('Invalid arguments: entities must be an array', '잘못된 인자: entities는 배열이어야 합니다');
        }
        if (entities.length === 0) {
            return this.formatErrorWithKo('Invalid arguments: entities array cannot be empty', '잘못된 인자: entities 배열은 비어있을 수 없습니다');
        }
        // 각 엔티티 검증
        for (const entity of entities) {
            if (!this.isValidEntity(entity)) {
                return this.formatErrorWithKo('Invalid entity: name, entityType, and observations are required', '잘못된 엔티티: name, entityType, observations가 필요합니다');
            }
        }
        const result = await this.manager.createEntities(entities);
        return this.formatResult(result);
    }
    /**
     * create_relations 도구 핸들러
     */
    async handleCreateRelations(args) {
        if (!this.isValidArgs(args, ['relations'])) {
            return this.formatErrorWithKo('Invalid arguments: relations array is required', '잘못된 인자: relations 배열이 필요합니다');
        }
        const { relations } = args;
        if (!Array.isArray(relations)) {
            return this.formatErrorWithKo('Invalid arguments: relations must be an array', '잘못된 인자: relations는 배열이어야 합니다');
        }
        if (relations.length === 0) {
            return this.formatErrorWithKo('Invalid arguments: relations array cannot be empty', '잘못된 인자: relations 배열은 비어있을 수 없습니다');
        }
        // 각 관계 검증
        for (const relation of relations) {
            if (!this.isValidRelation(relation)) {
                return this.formatErrorWithKo('Invalid relation: from, to, and relationType are required', '잘못된 관계: from, to, relationType이 필요합니다');
            }
        }
        const result = await this.manager.createRelations(relations);
        return this.formatResult(result);
    }
    /**
     * add_observations 도구 핸들러
     */
    async handleAddObservations(args) {
        if (!this.isValidArgs(args, ['observations'])) {
            return this.formatErrorWithKo('Invalid arguments: observations array is required', '잘못된 인자: observations 배열이 필요합니다');
        }
        const { observations } = args;
        if (!Array.isArray(observations)) {
            return this.formatErrorWithKo('Invalid arguments: observations must be an array', '잘못된 인자: observations는 배열이어야 합니다');
        }
        if (observations.length === 0) {
            return this.formatErrorWithKo('Invalid arguments: observations array cannot be empty', '잘못된 인자: observations 배열은 비어있을 수 없습니다');
        }
        // 각 관찰 추가 검증
        for (const obs of observations) {
            if (!this.isValidObservationAddition(obs)) {
                return this.formatErrorWithKo('Invalid observation: entityName and contents array are required', '잘못된 관찰: entityName과 contents 배열이 필요합니다');
            }
        }
        const result = await this.manager.addObservations(observations);
        return this.formatResult(result);
    }
    /**
     * delete_entities 도구 핸들러
     */
    async handleDeleteEntities(args) {
        if (!this.isValidArgs(args, ['entityNames'])) {
            return this.formatErrorWithKo('Invalid arguments: entityNames array is required', '잘못된 인자: entityNames 배열이 필요합니다');
        }
        const { entityNames } = args;
        if (!Array.isArray(entityNames)) {
            return this.formatErrorWithKo('Invalid arguments: entityNames must be an array', '잘못된 인자: entityNames는 배열이어야 합니다');
        }
        if (entityNames.length === 0) {
            return this.formatErrorWithKo('Invalid arguments: entityNames array cannot be empty', '잘못된 인자: entityNames 배열은 비어있을 수 없습니다');
        }
        if (!entityNames.every((name) => typeof name === 'string')) {
            return this.formatErrorWithKo('Invalid arguments: all entity names must be strings', '잘못된 인자: 모든 엔티티 이름은 문자열이어야 합니다');
        }
        const result = await this.manager.deleteEntities(entityNames);
        return this.formatResult(result);
    }
    /**
     * delete_observations 도구 핸들러
     */
    async handleDeleteObservations(args) {
        if (!this.isValidArgs(args, ['deletions'])) {
            return this.formatErrorWithKo('Invalid arguments: deletions array is required', '잘못된 인자: deletions 배열이 필요합니다');
        }
        const { deletions } = args;
        if (!Array.isArray(deletions)) {
            return this.formatErrorWithKo('Invalid arguments: deletions must be an array', '잘못된 인자: deletions는 배열이어야 합니다');
        }
        if (deletions.length === 0) {
            return this.formatErrorWithKo('Invalid arguments: deletions array cannot be empty', '잘못된 인자: deletions 배열은 비어있을 수 없습니다');
        }
        // 각 삭제 검증
        for (const deletion of deletions) {
            if (!this.isValidObservationDeletion(deletion)) {
                return this.formatErrorWithKo('Invalid deletion: entityName and observations array are required', '잘못된 삭제: entityName과 observations 배열이 필요합니다');
            }
        }
        const result = await this.manager.deleteObservations(deletions);
        return this.formatResult(result);
    }
    /**
     * delete_relations 도구 핸들러
     */
    async handleDeleteRelations(args) {
        if (!this.isValidArgs(args, ['relations'])) {
            return this.formatErrorWithKo('Invalid arguments: relations array is required', '잘못된 인자: relations 배열이 필요합니다');
        }
        const { relations } = args;
        if (!Array.isArray(relations)) {
            return this.formatErrorWithKo('Invalid arguments: relations must be an array', '잘못된 인자: relations는 배열이어야 합니다');
        }
        if (relations.length === 0) {
            return this.formatErrorWithKo('Invalid arguments: relations array cannot be empty', '잘못된 인자: relations 배열은 비어있을 수 없습니다');
        }
        // 각 관계 검증
        for (const relation of relations) {
            if (!this.isValidRelation(relation)) {
                return this.formatErrorWithKo('Invalid relation: from, to, and relationType are required', '잘못된 관계: from, to, relationType이 필요합니다');
            }
        }
        const result = await this.manager.deleteRelations(relations);
        return this.formatResult(result);
    }
    /**
     * read_graph 도구 핸들러
     */
    async handleReadGraph(_args) {
        const result = this.manager.readGraph();
        return this.formatResult(result);
    }
    /**
     * search_nodes 도구 핸들러
     */
    async handleSearchNodes(args) {
        if (!this.isValidArgs(args, ['query'])) {
            return this.formatErrorWithKo('Invalid arguments: query string is required', '잘못된 인자: query 문자열이 필요합니다');
        }
        const { query } = args;
        if (typeof query !== 'string') {
            return this.formatErrorWithKo('Invalid arguments: query must be a string', '잘못된 인자: query는 문자열이어야 합니다');
        }
        if (query.trim().length === 0) {
            return this.formatErrorWithKo('Invalid arguments: query cannot be empty', '잘못된 인자: query는 비어있을 수 없습니다');
        }
        const result = this.manager.searchNodes(query);
        return this.formatResult(result);
    }
    /**
     * open_nodes 도구 핸들러
     */
    async handleOpenNodes(args) {
        if (!this.isValidArgs(args, ['names'])) {
            return this.formatErrorWithKo('Invalid arguments: names array is required', '잘못된 인자: names 배열이 필요합니다');
        }
        const { names } = args;
        if (!Array.isArray(names)) {
            return this.formatErrorWithKo('Invalid arguments: names must be an array', '잘못된 인자: names는 배열이어야 합니다');
        }
        if (names.length === 0) {
            return this.formatErrorWithKo('Invalid arguments: names array cannot be empty', '잘못된 인자: names 배열은 비어있을 수 없습니다');
        }
        if (!names.every((name) => typeof name === 'string')) {
            return this.formatErrorWithKo('Invalid arguments: all names must be strings', '잘못된 인자: 모든 이름은 문자열이어야 합니다');
        }
        const result = this.manager.openNodes(names);
        return this.formatResult(result);
    }
    /**
     * 파라미터 검증 헬퍼
     */
    isValidArgs(args, requiredFields) {
        if (!args || typeof args !== 'object') {
            return false;
        }
        for (const field of requiredFields) {
            if (!(field in args)) {
                return false;
            }
        }
        return true;
    }
    /**
     * 엔티티 입력 검증
     */
    isValidEntity(entity) {
        if (!entity || typeof entity !== 'object') {
            return false;
        }
        const e = entity;
        return (typeof e.name === 'string' &&
            typeof e.entityType === 'string' &&
            Array.isArray(e.observations) &&
            e.observations.every((obs) => typeof obs === 'string'));
    }
    /**
     * 관계 입력 검증
     */
    isValidRelation(relation) {
        if (!relation || typeof relation !== 'object') {
            return false;
        }
        const r = relation;
        return (typeof r.from === 'string' &&
            typeof r.to === 'string' &&
            typeof r.relationType === 'string');
    }
    /**
     * 관찰 추가 입력 검증
     */
    isValidObservationAddition(obs) {
        if (!obs || typeof obs !== 'object') {
            return false;
        }
        const o = obs;
        return (typeof o.entityName === 'string' &&
            Array.isArray(o.contents) &&
            o.contents.every((content) => typeof content === 'string'));
    }
    /**
     * 관찰 삭제 입력 검증
     */
    isValidObservationDeletion(deletion) {
        if (!deletion || typeof deletion !== 'object') {
            return false;
        }
        const d = deletion;
        return (typeof d.entityName === 'string' &&
            Array.isArray(d.observations) &&
            d.observations.every((obs) => typeof obs === 'string'));
    }
    /**
     * 결과를 MCP CallToolResult 형식으로 포맷팅
     */
    formatResult(result) {
        if (result.success) {
            // data가 undefined인 경우 빈 객체로 대체 (MCP 프로토콜 요구사항)
            const data = result.data === undefined ? {} : result.data;
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(data, this.mapReplacer, 2),
                    },
                ],
            };
        }
        else {
            const errorMessage = result.errorKo
                ? `${result.error}\n${result.errorKo}`
                : result.error;
            return {
                content: [
                    {
                        type: 'text',
                        text: errorMessage,
                    },
                ],
                isError: true,
            };
        }
    }
    /**
     * 에러 메시지를 MCP CallToolResult 형식으로 포맷팅
     */
    formatError(message) {
        return {
            content: [
                {
                    type: 'text',
                    text: message,
                },
            ],
            isError: true,
        };
    }
    /**
     * 한국어 설명이 포함된 에러 메시지를 MCP CallToolResult 형식으로 포맷팅
     */
    formatErrorWithKo(message, messageKo) {
        return {
            content: [
                {
                    type: 'text',
                    text: `${message}\n${messageKo}`,
                },
            ],
            isError: true,
        };
    }
    /**
     * Map을 JSON으로 직렬화하기 위한 replacer
     */
    mapReplacer(_key, value) {
        if (value instanceof Map) {
            return Array.from(value.values());
        }
        return value;
    }
}
//# sourceMappingURL=mcp-server.js.map