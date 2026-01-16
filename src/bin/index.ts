#!/usr/bin/env node

/**
 * Knowledge Graph MCP Server CLI 진입점
 * npx를 통해 실행 가능
 */

import { MCPServer } from '../mcp-server.js';

async function main() {
  // 명령줄 인자에서 저장 경로 가져오기
  const args = process.argv.slice(2);
  const storagePath = args.find(arg => arg.startsWith('--path='))?.split('=')[1];

  try {
    const server = new MCPServer(storagePath);
    await server.start();
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

main();
