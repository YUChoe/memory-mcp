/**
 * Graph Storage
 * 지식 그래프를 JSON 파일로 영구 저장합니다.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { KnowledgeGraph, KnowledgeGraphJSON, Entity } from './types.js';

export class GraphStorage {
  private storagePath: string;

  constructor(projectPath?: string) {
    this.storagePath = this.determineStoragePath(projectPath);
  }

  /**
   * 저장 경로 결정
   * projectPath가 제공되면 .kiro 디렉토리 사용
   * 그렇지 않으면 홈 디렉토리 사용
   */
  private determineStoragePath(projectPath?: string): string {
    if (projectPath) {
      const kiroDir = path.join(projectPath, '.kiro');
      return path.join(kiroDir, 'knowledge-graph.json');
    } else {
      const homeDir = os.homedir();
      const kiroDir = path.join(homeDir, '.kiro');
      return path.join(kiroDir, 'knowledge-graph.json');
    }
  }

  /**
   * 저장 경로 반환
   */
  getStoragePath(): string {
    return this.storagePath;
  }

  /**
   * 그래프 로드
   */
  async load(): Promise<KnowledgeGraph> {
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8');
      const json: KnowledgeGraphJSON = JSON.parse(data);

      return this.deserialize(json);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // 파일이 없으면 빈 그래프 반환
        return {
          entities: new Map(),
          relations: [],
        };
      }

      // JSON 파싱 오류 또는 기타 오류
      throw new Error(
        `Failed to load graph: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 그래프 저장
   */
  async save(graph: KnowledgeGraph): Promise<void> {
    try {
      const json = this.serialize(graph);
      const data = JSON.stringify(json, null, 2);

      // 디렉토리가 없으면 생성
      const dir = path.dirname(this.storagePath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(this.storagePath, data, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to save graph: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 그래프 직렬화 (Map을 배열로 변환)
   */
  private serialize(graph: KnowledgeGraph): KnowledgeGraphJSON {
    return {
      entities: Array.from(graph.entities.values()),
      relations: graph.relations,
    };
  }

  /**
   * 그래프 역직렬화 (배열을 Map으로 변환)
   */
  private deserialize(json: KnowledgeGraphJSON): KnowledgeGraph {
    const entities = new Map<string, Entity>();

    for (const entity of json.entities) {
      entities.set(entity.name, entity);
    }

    return {
      entities,
      relations: json.relations,
    };
  }
}
