/**
 * Graph Storage
 * 지식 그래프를 JSON 파일로 영구 저장합니다.
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
export class GraphStorage {
    storagePath;
    constructor(projectPath) {
        this.storagePath = this.determineStoragePath(projectPath);
    }
    /**
     * 저장 경로 결정
     * projectPath가 제공되면 해당 경로에 직접 저장
     * 그렇지 않으면 홈 디렉토리에 저장
     */
    determineStoragePath(projectPath) {
        if (projectPath) {
            return path.join(projectPath, 'knowledge-graph.json');
        }
        else {
            const homeDir = os.homedir();
            return path.join(homeDir, 'knowledge-graph.json');
        }
    }
    /**
     * 저장 경로 반환
     */
    getStoragePath() {
        return this.storagePath;
    }
    /**
     * 그래프 로드
     */
    async load() {
        try {
            const data = await fs.readFile(this.storagePath, 'utf-8');
            const json = JSON.parse(data);
            return this.deserialize(json);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                // 파일이 없으면 빈 그래프 반환
                return {
                    entities: new Map(),
                    relations: [],
                };
            }
            // JSON 파싱 오류
            if (error instanceof SyntaxError) {
                throw new Error(`Failed to parse storage file: Invalid JSON format at ${this.storagePath}\n` +
                    `저장 파일을 읽을 수 없습니다: 잘못된 JSON 형식 (${this.storagePath})`);
            }
            // 기타 오류
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to load graph from ${this.storagePath}: ${errorMsg}\n` +
                `그래프 로드 실패 (${this.storagePath}): ${errorMsg}`);
        }
    }
    /**
     * 그래프 저장
     */
    async save(graph) {
        try {
            const json = this.serialize(graph);
            const data = JSON.stringify(json, null, 2);
            // 디렉토리가 없으면 생성
            const dir = path.dirname(this.storagePath);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(this.storagePath, data, 'utf-8');
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            // 권한 오류
            if (error.code === 'EACCES') {
                throw new Error(`Permission denied: Cannot write to ${this.storagePath}\n` +
                    `권한 거부: ${this.storagePath}에 쓸 수 없습니다`);
            }
            // 디스크 공간 부족
            if (error.code === 'ENOSPC') {
                throw new Error(`No space left on device: Cannot save graph to ${this.storagePath}\n` +
                    `디스크 공간 부족: ${this.storagePath}에 그래프를 저장할 수 없습니다`);
            }
            // 기타 오류
            throw new Error(`Failed to save graph to ${this.storagePath}: ${errorMsg}\n` +
                `그래프 저장 실패 (${this.storagePath}): ${errorMsg}`);
        }
    }
    /**
     * 그래프 직렬화 (Map을 배열로 변환)
     */
    serialize(graph) {
        return {
            entities: Array.from(graph.entities.values()),
            relations: graph.relations,
        };
    }
    /**
     * 그래프 역직렬화 (배열을 Map으로 변환)
     */
    deserialize(json) {
        const entities = new Map();
        for (const entity of json.entities) {
            entities.set(entity.name, entity);
        }
        return {
            entities,
            relations: json.relations,
        };
    }
}
//# sourceMappingURL=graph-storage.js.map