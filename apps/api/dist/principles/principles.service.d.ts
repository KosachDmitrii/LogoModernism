import type { DesignRuleCategory } from '@logo-platform/shared';
export declare class PrinciplesService {
    findAll(): {
        total: number;
        categories: DesignRuleCategory[];
    };
    search(filters: {
        query?: string;
        category?: string;
        industry?: string;
        era?: string;
    }): import("@logo-platform/shared").DesignRule[];
    findOne(id: string): import("@logo-platform/shared").DesignRule | undefined;
    findByCategory(category: string): import("@logo-platform/shared").DesignRule[];
    getGraph(): import("@logo-platform/shared").KnowledgeGraphEdge[];
    getReferences(): import("@logo-platform/shared").LogoReference[];
    getTemplates(tags?: string): import("@logo-platform/shared").PromptTemplate[];
}
