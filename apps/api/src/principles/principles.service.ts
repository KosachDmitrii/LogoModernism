import { Injectable } from '@nestjs/common';
import type { DesignRuleCategory } from '@logo-platform/shared';
import {
  designPrinciples,
  knowledgeGraph,
  logoReferences,
  promptTemplates,
  searchPrinciples,
  getPrincipleById,
  getPrinciplesByCategory,
} from '@logo-platform/knowledge-base';

@Injectable()
export class PrinciplesService {
  findAll() {
    return {
      total: designPrinciples.length,
      categories: [...new Set(designPrinciples.map((p) => p.category))],
    };
  }

  search(filters: { query?: string; category?: string; industry?: string; era?: string }) {
    return searchPrinciples({
      ...filters,
      category: filters.category as DesignRuleCategory | undefined,
    });
  }

  findOne(id: string) {
    return getPrincipleById(id);
  }

  findByCategory(category: string) {
    return getPrinciplesByCategory(category as never);
  }

  getGraph() {
    return knowledgeGraph;
  }

  getReferences() {
    return logoReferences;
  }

  getTemplates(tags?: string) {
    if (!tags) return promptTemplates;
    const tagList = tags.split(',').map((t) => t.trim().toLowerCase());
    return promptTemplates.filter((t) =>
      tagList.some((tag) => t.tags.some((tt) => tt.toLowerCase().includes(tag))),
    );
  }
}
