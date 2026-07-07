import type { DesignRule, KnowledgeGraphEdge, LogoReference, PromptTemplate } from '@logo-platform/shared';
import principlesData from './data/principles.json';
import graphData from './data/knowledge-graph.json';
import templatesData from './data/prompt-templates.json';
import {
  LOGO_CATALOG,
  getCatalogTaxonomy,
  getCatalogStats,
  getCatalogEntry,
  getCatalogByChapter,
  getCatalogBySection,
  getCaseStudies,
  getDesignerProfiles,
  searchCatalog,
  matchCatalogToDescription,
  getCatalogPrincipleIds,
  CATALOG_TAXONOMY,
  getFullCatalog,
  buildCatalogPromptContext,
} from './catalog';

export const designPrinciples: DesignRule[] = principlesData as DesignRule[];
export const knowledgeGraph: KnowledgeGraphEdge[] = graphData as KnowledgeGraphEdge[];
export const logoReferences: LogoReference[] = getFullCatalog();
export const promptTemplates: PromptTemplate[] = templatesData as PromptTemplate[];

export {
  LOGO_CATALOG,
  CATALOG_TAXONOMY,
  getCatalogTaxonomy,
  getCatalogStats,
  getCatalogEntry,
  getCatalogByChapter,
  getCatalogBySection,
  getCaseStudies,
  getDesignerProfiles,
  searchCatalog,
  matchCatalogToDescription,
  getCatalogPrincipleIds,
  getFullCatalog,
  buildCatalogPromptContext,
};

export function getPrincipleById(id: string): DesignRule | undefined {
  return designPrinciples.find((p) => p.id === id);
}

export function getPrinciplesByCategory(category: DesignRule['category']): DesignRule[] {
  return designPrinciples.filter((p) => p.category === category);
}

export function getCompatiblePrinciples(principleId: string): DesignRule[] {
  const principle = getPrincipleById(principleId);
  if (!principle) return [];

  const compatibleIds = new Set([
    ...principle.compatibility,
    ...knowledgeGraph
      .filter((e) => e.from === principleId && e.relation !== 'conflicts_with')
      .map((e) => e.to),
    ...knowledgeGraph
      .filter((e) => e.to === principleId && e.relation !== 'conflicts_with')
      .map((e) => e.from),
  ]);

  return designPrinciples.filter((p) => compatibleIds.has(p.id));
}

export function getConflictingPrinciples(principleIds: string[]): string[][] {
  const conflicts: string[][] = [];
  for (const edge of knowledgeGraph) {
    if (edge.relation !== 'conflicts_with') continue;
    if (principleIds.includes(edge.from) && principleIds.includes(edge.to)) {
      conflicts.push([edge.from, edge.to]);
    }
  }
  return conflicts;
}

export function searchPrinciples(filters: {
  query?: string;
  category?: DesignRule['category'];
  tags?: string[];
  era?: string;
  industry?: string;
}): DesignRule[] {
  let results = [...designPrinciples];

  if (filters.category) {
    results = results.filter((p) => p.category === filters.category);
  }

  if (filters.era) {
    results = results.filter((p) => p.era?.includes(filters.era as never));
  }

  if (filters.industry) {
    const industry = filters.industry.toLowerCase();
    results = results.filter(
      (p) =>
        p.industries?.some((i) => i.toLowerCase().includes(industry)) ||
        p.tags.some((t) => t.toLowerCase().includes(industry)),
    );
  }

  if (filters.tags?.length) {
    results = results.filter((p) =>
      filters.tags!.some((tag) => p.tags.some((t) => t.toLowerCase() === tag.toLowerCase())),
    );
  }

  if (filters.query) {
    const q = filters.query.toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.promptFragment.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }

  return results;
}

export { principlesData, graphData, templatesData };
