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
    getCatalogTaxonomy(): import("@logo-platform/shared").CatalogTaxonomyChapter[];
    getCatalogStats(): {
        total: number;
        curated: number;
        imported: number;
        byChapter: {
            geometric: number;
            effect: number;
            typographic: number;
        };
        byKind: {
            logo: number;
            case_study: number;
            designer_profile: number;
        };
        sections: number;
        caseStudies: 8;
        designerProfiles: 8;
    };
    getCatalogEntry(id: string): import("@logo-platform/shared").LogoReference | null;
    getCaseStudies(): import("@logo-platform/shared").LogoReference[];
    getDesignerProfiles(): import("@logo-platform/shared").LogoReference[];
    searchCatalog(filters: {
        query?: string;
        chapter?: string;
        section?: string;
        era?: string;
        industry?: string;
        designer?: string;
        entryKind?: string;
        markType?: string;
    }): import("@logo-platform/shared").LogoReference[];
    getTemplates(tags?: string): import("@logo-platform/shared").PromptTemplate[];
}
