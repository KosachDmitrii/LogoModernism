import { Injectable } from '@nestjs/common';
import type { DesignRuleCategory } from '@logo-platform/shared';
import {
  designPrinciples,
  knowledgeGraph,
  promptTemplates,
  searchPrinciples,
  getPrincipleById,
  getPrinciplesByCategory,
  getCatalogTaxonomy,
  getCatalogStats,
  getCatalogEntry,
  getCaseStudies,
  getDesignerProfiles,
  searchCatalog,
  getCatalogRecommendations,
  getFullCatalog,
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
    return getFullCatalog();
  }

  getCatalogTaxonomy() {
    return getCatalogTaxonomy();
  }

  getCatalogStats() {
    return getCatalogStats();
  }

  getCatalogEntry(id: string) {
    return getCatalogEntry(id) ?? null;
  }

  getCaseStudies() {
    return getCaseStudies();
  }

  getDesignerProfiles() {
    return getDesignerProfiles();
  }

  searchCatalog(filters: {
    query?: string;
    chapter?: string;
    section?: string;
    era?: string;
    industry?: string;
    rankByIndustry?: string;
    designer?: string;
    entryKind?: string;
    markType?: string;
  }) {
    return searchCatalog({
      ...filters,
      chapter: filters.chapter as never,
      era: filters.era as never,
      entryKind: filters.entryKind as never,
      markType: filters.markType as never,
    });
  }

  getCatalogRecommendations(filters: {
    industry: string;
    markType?: string;
    era?: string;
    limit?: number;
  }) {
    if (!filters.industry?.trim()) return [];
    return getCatalogRecommendations({
      industry: filters.industry,
      markType: filters.markType as never,
      era: filters.era as never,
      limit: filters.limit,
    });
  }

  getTemplates(tags?: string) {
    if (!tags) return promptTemplates;
    const tagList = tags.split(',').map((t) => t.trim().toLowerCase());
    return promptTemplates.filter((t) =>
      tagList.some((tag) => t.tags.some((tt) => tt.toLowerCase().includes(tag))),
    );
  }
}
