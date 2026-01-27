/**
 * Knowledge Graph Manager
 * 지식 그래프의 엔티티, 관계, 관찰 내용을 관리합니다.
 */
export class KnowledgeGraphManager {
    entities;
    relations;
    storage;
    writeLock = Promise.resolve();
    constructor(storage) {
        this.entities = new Map();
        this.relations = [];
        this.storage = storage;
    }
    /**
     * 쓰기 작업을 위한 락 획득
     */
    async acquireWriteLock(operation) {
        const previousLock = this.writeLock;
        let releaseLock;
        this.writeLock = new Promise((resolve) => {
            releaseLock = resolve;
        });
        try {
            await previousLock;
            return await operation();
        }
        finally {
            releaseLock();
        }
    }
    /**
     * 저장소에서 그래프 로드
     */
    async loadFromStorage() {
        const graph = await this.storage.load();
        this.entities = graph.entities;
        this.relations = graph.relations;
    }
    /**
     * 저장소에 그래프 저장
     */
    async saveToStorage() {
        await this.storage.save({
            entities: this.entities,
            relations: this.relations,
        });
    }
    /**
     * 엔티티 생성
     * default_user는 upsert 방식으로 동작 (이미 존재하면 기존 엔티티 반환)
     */
    async createEntities(inputs) {
        return this.acquireWriteLock(async () => {
            const created = [];
            for (const input of inputs) {
                // 빈 이름 검증
                if (!input.name || input.name.trim().length === 0) {
                    return {
                        success: false,
                        error: 'Entity name cannot be empty',
                        errorKo: '엔티티 이름은 비어있을 수 없습니다',
                    };
                }
                // default_user는 upsert 방식
                if (input.name === 'default_user' && this.entities.has(input.name)) {
                    const existingEntity = this.entities.get(input.name);
                    created.push(existingEntity);
                    continue;
                }
                // 다른 엔티티는 중복 검사
                if (this.entities.has(input.name)) {
                    return {
                        success: false,
                        error: `Entity with name "${input.name}" already exists`,
                        errorKo: `"${input.name}" 이름을 가진 엔티티가 이미 존재합니다`,
                    };
                }
                const entity = {
                    name: input.name,
                    entityType: input.entityType,
                    observations: [...input.observations],
                };
                this.entities.set(entity.name, entity);
                created.push(entity);
            }
            await this.saveToStorage();
            return {
                success: true,
                data: created,
            };
        });
    }
    /**
     * 엔티티 조회
     */
    openNodes(names) {
        const result = [];
        const notFound = [];
        for (const name of names) {
            const entity = this.entities.get(name);
            if (entity) {
                result.push(entity);
            }
            else {
                notFound.push(name);
            }
        }
        if (notFound.length > 0) {
            return {
                success: false,
                error: `Entities not found: [${notFound.map(n => `"${n}"`).join(', ')}]`,
                errorKo: `다음 엔티티를 찾을 수 없습니다: [${notFound.map(n => `"${n}"`).join(', ')}]`,
            };
        }
        return {
            success: true,
            data: result,
        };
    }
    /**
     * 엔티티 삭제
     */
    async deleteEntities(names) {
        return this.acquireWriteLock(async () => {
            for (const name of names) {
                this.entities.delete(name);
                // 관련 관계 삭제
                this.relations = this.relations.filter((r) => r.from !== name && r.to !== name);
            }
            await this.saveToStorage();
            return {
                success: true,
                data: undefined,
            };
        });
    }
    /**
     * 관계 생성
     */
    async createRelations(inputs) {
        return this.acquireWriteLock(async () => {
            const created = [];
            const missingEntities = [];
            for (const input of inputs) {
                // 엔티티 존재 검증
                if (!this.entities.has(input.from)) {
                    missingEntities.push(input.from);
                }
                if (!this.entities.has(input.to)) {
                    missingEntities.push(input.to);
                }
            }
            // 누락된 엔티티가 있으면 모두 나열
            if (missingEntities.length > 0) {
                const uniqueMissing = [...new Set(missingEntities)];
                return {
                    success: false,
                    error: `Entities not found: [${uniqueMissing.map(n => `"${n}"`).join(', ')}]`,
                    errorKo: `다음 엔티티를 찾을 수 없습니다: [${uniqueMissing.map(n => `"${n}"`).join(', ')}]`,
                };
            }
            for (const input of inputs) {
                const relation = {
                    from: input.from,
                    to: input.to,
                    relationType: input.relationType,
                };
                this.relations.push(relation);
                created.push(relation);
            }
            await this.saveToStorage();
            return {
                success: true,
                data: created,
            };
        });
    }
    /**
     * 관계 삭제
     */
    async deleteRelations(inputs) {
        return this.acquireWriteLock(async () => {
            for (const input of inputs) {
                this.relations = this.relations.filter((r) => !(r.from === input.from &&
                    r.to === input.to &&
                    r.relationType === input.relationType));
            }
            await this.saveToStorage();
            return {
                success: true,
                data: undefined,
            };
        });
    }
    /**
     * 관찰 내용 추가
     */
    async addObservations(additions) {
        return this.acquireWriteLock(async () => {
            const missingEntities = [];
            // 먼저 모든 엔티티 존재 확인
            for (const addition of additions) {
                if (!this.entities.has(addition.entityName)) {
                    missingEntities.push(addition.entityName);
                }
            }
            // 누락된 엔티티가 있으면 모두 나열
            if (missingEntities.length > 0) {
                const uniqueMissing = [...new Set(missingEntities)];
                return {
                    success: false,
                    error: `Entities not found: [${uniqueMissing.map(n => `"${n}"`).join(', ')}]`,
                    errorKo: `다음 엔티티를 찾을 수 없습니다: [${uniqueMissing.map(n => `"${n}"`).join(', ')}]`,
                };
            }
            // 모든 엔티티가 존재하면 관찰 추가
            for (const addition of additions) {
                const entity = this.entities.get(addition.entityName);
                entity.observations.push(...addition.contents);
            }
            await this.saveToStorage();
            return {
                success: true,
                data: undefined,
            };
        });
    }
    /**
     * 관찰 내용 삭제
     */
    async deleteObservations(deletions) {
        return this.acquireWriteLock(async () => {
            const missingEntities = [];
            // 먼저 모든 엔티티 존재 확인
            for (const deletion of deletions) {
                if (!this.entities.has(deletion.entityName)) {
                    missingEntities.push(deletion.entityName);
                }
            }
            // 누락된 엔티티가 있으면 모두 나열
            if (missingEntities.length > 0) {
                const uniqueMissing = [...new Set(missingEntities)];
                return {
                    success: false,
                    error: `Entities not found: [${uniqueMissing.map(n => `"${n}"`).join(', ')}]`,
                    errorKo: `다음 엔티티를 찾을 수 없습니다: [${uniqueMissing.map(n => `"${n}"`).join(', ')}]`,
                };
            }
            // 모든 엔티티가 존재하면 관찰 삭제
            for (const deletion of deletions) {
                const entity = this.entities.get(deletion.entityName);
                entity.observations = entity.observations.filter((obs) => !deletion.observations.includes(obs));
            }
            await this.saveToStorage();
            return {
                success: true,
                data: undefined,
            };
        });
    }
    /**
     * 그래프 읽기
     */
    readGraph() {
        return {
            success: true,
            data: {
                entities: new Map(this.entities),
                relations: [...this.relations],
            },
        };
    }
    /**
     * 노드 검색
     *
     * 쿼리를 공백으로 토큰화하여 각 토큰에 대해 OR 검색 수행
     * 하나 이상의 토큰이 엔티티의 이름, 타입, 또는 관찰 내용에 포함되면 매칭
     * 빈 쿼리는 모든 엔티티를 반환
     */
    searchNodes(query) {
        const lowerQuery = query.toLowerCase();
        // 쿼리를 공백으로 토큰화 (빈 토큰 제거)
        const tokens = lowerQuery.split(/\s+/).filter(token => token.length > 0);
        // 토큰이 없으면 (빈 쿼리) 모든 엔티티 반환
        if (tokens.length === 0) {
            return {
                success: true,
                data: Array.from(this.entities.values()),
            };
        }
        const results = [];
        for (const entity of this.entities.values()) {
            const entityName = entity.name.toLowerCase();
            const entityType = entity.entityType.toLowerCase();
            const entityObservations = entity.observations.map(obs => obs.toLowerCase());
            // 하나 이상의 토큰이 매칭되면 결과에 포함
            const hasMatch = tokens.some(token => {
                const matchesName = entityName.includes(token);
                const matchesType = entityType.includes(token);
                const matchesObservations = entityObservations.some(obs => obs.includes(token));
                return matchesName || matchesType || matchesObservations;
            });
            if (hasMatch) {
                results.push(entity);
            }
        }
        return {
            success: true,
            data: results,
        };
    }
}
//# sourceMappingURL=knowledge-graph-manager.js.map