/**
 * Graph Storage
 * 지식 그래프를 JSON 파일로 영구 저장합니다.
 */
import { KnowledgeGraph } from './types.js';
export declare class GraphStorage {
    private storagePath;
    constructor(projectPath?: string);
    /**
     * 저장 경로 결정
     * projectPath가 제공되면 해당 경로에 직접 저장
     * 그렇지 않으면 홈 디렉토리에 저장
     */
    private determineStoragePath;
    /**
     * 저장 경로 반환
     */
    getStoragePath(): string;
    /**
     * 그래프 로드
     */
    load(): Promise<KnowledgeGraph>;
    /**
     * 그래프 저장
     */
    save(graph: KnowledgeGraph): Promise<void>;
    /**
     * 그래프 직렬화 (Map을 배열로 변환)
     */
    private serialize;
    /**
     * 그래프 역직렬화 (배열을 Map으로 변환)
     */
    private deserialize;
}
//# sourceMappingURL=graph-storage.d.ts.map