import type { DesignRule, KnowledgeGraphEdge, LogoReference, PromptTemplate } from '@logo-platform/shared';
import principlesData from './data/principles.json';
import graphData from './data/knowledge-graph.json';
import referencesData from './data/logo-references.json';
import templatesData from './data/prompt-templates.json';
export declare const designPrinciples: DesignRule[];
export declare const knowledgeGraph: KnowledgeGraphEdge[];
export declare const logoReferences: LogoReference[];
export declare const promptTemplates: PromptTemplate[];
export declare function getPrincipleById(id: string): DesignRule | undefined;
export declare function getPrinciplesByCategory(category: DesignRule['category']): DesignRule[];
export declare function getCompatiblePrinciples(principleId: string): DesignRule[];
export declare function getConflictingPrinciples(principleIds: string[]): string[][];
export declare function searchPrinciples(filters: {
    query?: string;
    category?: DesignRule['category'];
    tags?: string[];
    era?: string;
    industry?: string;
}): DesignRule[];
export { principlesData, graphData, referencesData, templatesData };
//# sourceMappingURL=index.d.ts.map