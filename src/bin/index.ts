#!/usr/bin/env node

/**
 * Knowledge Graph MCP Server CLI 진입점
 *
 * 사용법:
 *   npx knowledge-graph-mcp-server [options]
 *
 * 옵션:
 *   --storage-path <path>  저장 경로 지정 (.kiro 디렉토리가 있는 프로젝트 경로)
 */

import { MCPServer } from '../mcp-server.js';

/**
 * 명령줄 인자 파싱
 */
function parseArgs(): { storagePath?: string } {
  const args = process.argv.slice(2);
  const result: { storagePath?: string } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--storage-path' || arg === '-s') {
      if (i + 1 < args.length) {
        result.storagePath = args[i + 1];
        i++; // 다음 인자 건너뛰기
      } else {
        console.error('Error: --storage-path requires a path argument');
        console.error('에러: --storage-path는 경로 인자가 필요합니다');
        process.exit(1);
      }
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Error: Unknown argument: ${arg}`);
      console.error(`에러: 알 수 없는 인자: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  return result;
}

/**
 * 도움말 출력
 */
function printHelp(): void {
  console.log(`
Knowledge Graph MCP Server

Usage:
  npx knowledge-graph-mcp-server [options]

Options:
  --storage-path, -s <path>  Specify storage path (project path with .kiro directory)
                             저장 경로 지정 (.kiro 디렉토리가 있는 프로젝트 경로)
  --help, -h                 Show this help message
                             도움말 표시

Examples:
  npx knowledge-graph-mcp-server
  npx knowledge-graph-mcp-server --storage-path /path/to/project
  `);
}

/**
 * 메인 함수
 */
async function main(): Promise<void> {
  try {
    // 명령줄 인자 파싱
    const { storagePath } = parseArgs();

    // MCP 서버 생성 및 시작
    const server = new MCPServer(storagePath);
    await server.start();

    // 프로세스 종료 시 정리
    process.on('SIGINT', () => {
      console.error('Shutting down Knowledge Graph MCP Server...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.error('Shutting down Knowledge Graph MCP Server...');
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    console.error('서버 시작 실패:', error);
    process.exit(1);
  }
}

// 메인 함수 실행
main();
