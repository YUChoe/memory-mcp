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
} from '@modelcontextprotocol/sdk/types.js';
import { KnowledgeGraphManager } from './knowledge-graph-manager.js';
import { GraphStorage } from './graph-storage.js';
import { ToolResult } from './types.js';

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
    // TODO: 8.3에서 구현
  }
}
