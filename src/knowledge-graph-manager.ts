/**
 * Knowledge Graph Manager
 * 지식 그래프의 엔티티, 관계, 관찰 내용을 관리합니다.
 */

import {
  Entity,
  EntityInput,
  Relation,
  RelationInput,
  ObservationAddition,
  ObservationDeletion,
  KnowledgeGraph,
  Result,
} from './types.js';
import { GraphStorage } from './graph-storage.js';

export class KnowledgeGraphManager {
  private entities: Map<string, Entity>;
  private relations: Relation[];
  private storage: GraphStorage;

  constructor(storage: GraphStorage) {
    this.entities = new Map();
    this.relations = [];
    this.storage = storage;
  }

  /**
   * 저장소에서 그래프 로드
   */
  async loadFromStorage(): Promise<void> {
    const graph = await this.storage.load();
    this.entities = graph.entities;
    this.relations = graph.relations;
  }

  /**
   * 저장소에 그래프 저장
   */
  private async saveToStorage(): Promise<void> {
    await this.storage.save({
      entities: this.entities,
      relations: this.relations,
    });
  }

  /**
   * 엔티티 생성
   */
  async createEntities(inputs: EntityInput[]): Promise<Result<Entity[]>> {
    const created: Entity[] = [];

    for (const input of inputs) {
      // 중복 검사
      if (this.entities.has(input.name)) {
        return {
          success: false,
          error: `Entity with name "${input.name}" already exists`,
          errorKo: `"${input.name}" 이름을 가진 엔티티가 이미 존재합니다`,
        };
      }

      const entity: Entity = {
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
  }

  /**
   * 엔티티 조회
   */
  openNodes(names: string[]): Result<Entity[]> {
    const result: Entity[] = [];
    const notFound: string[] = [];

    for (const name of names) {
      const entity = this.entities.get(name);
      if (entity) {
        result.push(entity);
      } else {
        notFound.push(name);
      }
    }

    if (notFound.length > 0) {
      return {
        success: false,
        error: `Entities not found: ${JSON.stringify(notFound)}`,
        errorKo: `다음 엔티티를 찾을 수 없습니다: ${JSON.stringify(notFound)}`,
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
  async deleteEntities(names: string[]): Promise<Result<void>> {
    for (const name of names) {
      this.entities.delete(name);
      // 관련 관계 삭제
      this.relations = this.relations.filter(
        (r) => r.from !== name && r.to !== name
      );
    }

    await this.saveToStorage();

    return {
      success: true,
      data: undefined,
    };
  }

  /**
   * 관계 생성
   */
  async createRelations(inputs: RelationInput[]): Promise<Result<Relation[]>> {
    const created: Relation[] = [];

    for (const input of inputs) {
      // 엔티티 존재 검증
      if (!this.entities.has(input.from)) {
        return {
          success: false,
          error: `Entity not found: "${input.from}"`,
          errorKo: `엔티티를 찾을 수 없습니다: "${input.from}"`,
        };
      }
      if (!this.entities.has(input.to)) {
        return {
          success: false,
          error: `Entity not found: "${input.to}"`,
          errorKo: `엔티티를 찾을 수 없습니다: "${input.to}"`,
        };
      }

      const relation: Relation = {
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
  }

  /**
   * 관계 삭제
   */
  async deleteRelations(inputs: RelationInput[]): Promise<Result<void>> {
    for (const input of inputs) {
      this.relations = this.relations.filter(
        (r) =>
          !(
            r.from === input.from &&
            r.to === input.to &&
            r.relationType === input.relationType
          )
      );
    }

    await this.saveToStorage();

    return {
      success: true,
      data: undefined,
    };
  }

  /**
   * 관찰 내용 추가
   */
  async addObservations(additions: ObservationAddition[]): Promise<Result<void>> {
    for (const addition of additions) {
      const entity = this.entities.get(addition.entityName);
      if (!entity) {
        return {
          success: false,
          error: `Entity not found: "${addition.entityName}"`,
          errorKo: `엔티티를 찾을 수 없습니다: "${addition.entityName}"`,
        };
      }

      entity.observations.push(...addition.contents);
    }

    await this.saveToStorage();

    return {
      success: true,
      data: undefined,
    };
  }

  /**
   * 관찰 내용 삭제
   */
  async deleteObservations(deletions: ObservationDeletion[]): Promise<Result<void>> {
    for (const deletion of deletions) {
      const entity = this.entities.get(deletion.entityName);
      if (!entity) {
        return {
          success: false,
          error: `Entity not found: "${deletion.entityName}"`,
          errorKo: `엔티티를 찾을 수 없습니다: "${deletion.entityName}"`,
        };
      }

      entity.observations = entity.observations.filter(
        (obs) => !deletion.observations.includes(obs)
      );
    }

    await this.saveToStorage();

    return {
      success: true,
      data: undefined,
    };
  }

  /**
   * 그래프 읽기
   */
  readGraph(): Result<KnowledgeGraph> {
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
   */
  searchNodes(query: string): Result<Entity[]> {
    const lowerQuery = query.toLowerCase();
    const results: Entity[] = [];

    for (const entity of this.entities.values()) {
      const matchesName = entity.name.toLowerCase().includes(lowerQuery);
      const matchesType = entity.entityType.toLowerCase().includes(lowerQuery);
      const matchesObservations = entity.observations.some((obs) =>
        obs.toLowerCase().includes(lowerQuery)
      );

      if (matchesName || matchesType || matchesObservations) {
        results.push(entity);
      }
    }

    return {
      success: true,
      data: results,
    };
  }
}
