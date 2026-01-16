/**
 * MCP 서버 구현
 * 9개의 도구를 등록하고 MCP 프로토콜을 구현합니다.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { KnowledgeGraphManager } from './knowledge-graph-manager.js';
import { GraphStorage } from './graph-storage.js';
import { Result } from './types.js';

export class MCPServer {
  private server: Server;
  private manager: KnowledgeGraphManager;

  constructor(storagePath?: string) {
    this.server = new Server(
      {
        name: 'knowledge-graph-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    const storage = new GraphStorage(storagePath);
    this.manager = new KnowledgeGraphManager(storage);
  }

  /**
   * 서버 초기화 및 시작
   */
  async start(): Promise<void> {
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
  private registerTools(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
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
  private registerHandlers(): void {
    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
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
            return this.formatError(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return this.formatError(
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  /**
   * create_entities 도구 핸들러
   */
  private async handleCreateEntities(args: unknown): Promise<CallToolResult> {
    if (!this.isValidArgs(args, ['entities'])) {
      return this.formatError('Invalid arguments: entities array is required');
    }

    const { entities } = args as { entities: unknown };

    if (!Array.isArray(entities)) {
      return this.formatError('Invalid arguments: entities must be an array');
    }

    // 각 엔티티 검증
    for (const entity of entities) {
      if (!this.isValidEntity(entity)) {
        return this.formatError(
          'Invalid entity: name, entityType, and observations are required'
        );
      }
    }

    const result = await this.manager.createEntities(entities);
    return this.formatResult(result);
  }

  /**
   * create_relations 도구 핸들러
   */
  private async handleCreateRelations(args: unknown): Promise<CallToolResult> {
    if (!this.isValidArgs(args, ['relations'])) {
      return this.formatError('Invalid arguments: relations array is required');
    }

    const { relations } = args as { relations: unknown };

    if (!Array.isArray(relations)) {
      return this.formatError('Invalid arguments: relations must be an array');
    }

    // 각 관계 검증
    for (const relation of relations) {
      if (!this.isValidRelation(relation)) {
        return this.formatError(
          'Invalid relation: from, to, and relationType are required'
        );
      }
    }

    const result = await this.manager.createRelations(relations);
    return this.formatResult(result);
  }

  /**
   * add_observations 도구 핸들러
   */
  private async handleAddObservations(args: unknown): Promise<CallToolResult> {
    if (!this.isValidArgs(args, ['observations'])) {
      return this.formatError('Invalid arguments: observations array is required');
    }

    const { observations } = args as { observations: unknown };

    if (!Array.isArray(observations)) {
      return this.formatError('Invalid arguments: observations must be an array');
    }

    // 각 관찰 추가 검증
    for (const obs of observations) {
      if (!this.isValidObservationAddition(obs)) {
        return this.formatError(
          'Invalid observation: entityName and contents array are required'
        );
      }
    }

    const result = await this.manager.addObservations(observations);
    return this.formatResult(result);
  }

  /**
   * delete_entities 도구 핸들러
   */
  private async handleDeleteEntities(args: unknown): Promise<CallToolResult> {
    if (!this.isValidArgs(args, ['entityNames'])) {
      return this.formatError('Invalid arguments: entityNames array is required');
    }

    const { entityNames } = args as { entityNames: unknown };

    if (!Array.isArray(entityNames)) {
      return this.formatError('Invalid arguments: entityNames must be an array');
    }

    if (!entityNames.every((name) => typeof name === 'string')) {
      return this.formatError('Invalid arguments: all entity names must be strings');
    }

    const result = await this.manager.deleteEntities(entityNames);
    return this.formatResult(result);
  }

  /**
   * delete_observations 도구 핸들러
   */
  private async handleDeleteObservations(args: unknown): Promise<CallToolResult> {
    if (!this.isValidArgs(args, ['deletions'])) {
      return this.formatError('Invalid arguments: deletions array is required');
    }

    const { deletions } = args as { deletions: unknown };

    if (!Array.isArray(deletions)) {
      return this.formatError('Invalid arguments: deletions must be an array');
    }

    // 각 삭제 검증
    for (const deletion of deletions) {
      if (!this.isValidObservationDeletion(deletion)) {
        return this.formatError(
          'Invalid deletion: entityName and observations array are required'
        );
      }
    }

    const result = await this.manager.deleteObservations(deletions);
    return this.formatResult(result);
  }

  /**
   * delete_relations 도구 핸들러
   */
  private async handleDeleteRelations(args: unknown): Promise<CallToolResult> {
    if (!this.isValidArgs(args, ['relations'])) {
      return this.formatError('Invalid arguments: relations array is required');
    }

    const { relations } = args as { relations: unknown };

    if (!Array.isArray(relations)) {
      return this.formatError('Invalid arguments: relations must be an array');
    }

    // 각 관계 검증
    for (const relation of relations) {
      if (!this.isValidRelation(relation)) {
        return this.formatError(
          'Invalid relation: from, to, and relationType are required'
        );
      }
    }

    const result = await this.manager.deleteRelations(relations);
    return this.formatResult(result);
  }

  /**
   * read_graph 도구 핸들러
   */
  private async handleReadGraph(_args: unknown): Promise<CallToolResult> {
    const result = this.manager.readGraph();
    return this.formatResult(result);
  }

  /**
   * search_nodes 도구 핸들러
   */
  private async handleSearchNodes(args: unknown): Promise<CallToolResult> {
    if (!this.isValidArgs(args, ['query'])) {
      return this.formatError('Invalid arguments: query string is required');
    }

    const { query } = args as { query: unknown };

    if (typeof query !== 'string') {
      return this.formatError('Invalid arguments: query must be a string');
    }

    const result = this.manager.searchNodes(query);
    return this.formatResult(result);
  }

  /**
   * open_nodes 도구 핸들러
   */
  private async handleOpenNodes(args: unknown): Promise<CallToolResult> {
    if (!this.isValidArgs(args, ['names'])) {
      return this.formatError('Invalid arguments: names array is required');
    }

    const { names } = args as { names: unknown };

    if (!Array.isArray(names)) {
      return this.formatError('Invalid arguments: names must be an array');
    }

    if (!names.every((name) => typeof name === 'string')) {
      return this.formatError('Invalid arguments: all names must be strings');
    }

    const result = this.manager.openNodes(names);
    return this.formatResult(result);
  }

  /**
   * 파라미터 검증 헬퍼
   */
  private isValidArgs(args: unknown, requiredFields: string[]): boolean {
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
  private isValidEntity(entity: unknown): boolean {
    if (!entity || typeof entity !== 'object') {
      return false;
    }

    const e = entity as Record<string, unknown>;
    return (
      typeof e.name === 'string' &&
      typeof e.entityType === 'string' &&
      Array.isArray(e.observations) &&
      e.observations.every((obs) => typeof obs === 'string')
    );
  }

  /**
   * 관계 입력 검증
   */
  private isValidRelation(relation: unknown): boolean {
    if (!relation || typeof relation !== 'object') {
      return false;
    }

    const r = relation as Record<string, unknown>;
    return (
      typeof r.from === 'string' &&
      typeof r.to === 'string' &&
      typeof r.relationType === 'string'
    );
  }

  /**
   * 관찰 추가 입력 검증
   */
  private isValidObservationAddition(obs: unknown): boolean {
    if (!obs || typeof obs !== 'object') {
      return false;
    }

    const o = obs as Record<string, unknown>;
    return (
      typeof o.entityName === 'string' &&
      Array.isArray(o.contents) &&
      o.contents.every((content) => typeof content === 'string')
    );
  }

  /**
   * 관찰 삭제 입력 검증
   */
  private isValidObservationDeletion(deletion: unknown): boolean {
    if (!deletion || typeof deletion !== 'object') {
      return false;
    }

    const d = deletion as Record<string, unknown>;
    return (
      typeof d.entityName === 'string' &&
      Array.isArray(d.observations) &&
      d.observations.every((obs) => typeof obs === 'string')
    );
  }

  /**
   * 결과를 MCP CallToolResult 형식으로 포맷팅
   */
  private formatResult<T>(result: Result<T>): CallToolResult {
    if (result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.data, this.mapReplacer, 2),
          },
        ],
      };
    } else {
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
  private formatError(message: string): CallToolResult {
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
   * Map을 JSON으로 직렬화하기 위한 replacer
   */
  private mapReplacer(_key: string, value: unknown): unknown {
    if (value instanceof Map) {
      return Array.from(value.values());
    }
    return value;
  }
}
