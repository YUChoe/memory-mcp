/**
 * MCP 서버 구현
 * 9개의 도구를 등록하고 MCP 프로토콜을 구현합니다.
 */
export declare class MCPServer {
    private server;
    private manager;
    constructor(storagePath?: string);
    /**
     * 서버 초기화 및 시작
     */
    start(): Promise<void>;
    /**
     * 9개의 MCP 도구 등록
     */
    private registerTools;
    /**
     * 도구 핸들러 등록
     */
    private registerHandlers;
    /**
     * create_entities 도구 핸들러
     */
    private handleCreateEntities;
    /**
     * create_relations 도구 핸들러
     */
    private handleCreateRelations;
    /**
     * add_observations 도구 핸들러
     */
    private handleAddObservations;
    /**
     * delete_entities 도구 핸들러
     */
    private handleDeleteEntities;
    /**
     * delete_observations 도구 핸들러
     */
    private handleDeleteObservations;
    /**
     * delete_relations 도구 핸들러
     */
    private handleDeleteRelations;
    /**
     * read_graph 도구 핸들러
     */
    private handleReadGraph;
    /**
     * search_nodes 도구 핸들러
     */
    private handleSearchNodes;
    /**
     * open_nodes 도구 핸들러
     */
    private handleOpenNodes;
    /**
     * 파라미터 검증 헬퍼
     */
    private isValidArgs;
    /**
     * 엔티티 입력 검증
     */
    private isValidEntity;
    /**
     * 관계 입력 검증
     */
    private isValidRelation;
    /**
     * 관찰 추가 입력 검증
     */
    private isValidObservationAddition;
    /**
     * 관찰 삭제 입력 검증
     */
    private isValidObservationDeletion;
    /**
     * 결과를 MCP CallToolResult 형식으로 포맷팅
     */
    private formatResult;
    /**
     * 에러 메시지를 MCP CallToolResult 형식으로 포맷팅
     */
    private formatError;
    /**
     * 한국어 설명이 포함된 에러 메시지를 MCP CallToolResult 형식으로 포맷팅
     */
    private formatErrorWithKo;
    /**
     * Map을 JSON으로 직렬화하기 위한 replacer
     */
    private mapReplacer;
}
//# sourceMappingURL=mcp-server.d.ts.map