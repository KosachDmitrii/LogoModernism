import { PrinciplesService } from './principles.service';
export declare class PrinciplesController {
    private readonly principlesService;
    constructor(principlesService: PrinciplesService);
    overview(): {
        total: number;
        categories: import("@logo-platform/shared").DesignRuleCategory[];
    };
    search(query?: string, category?: string, industry?: string, era?: string): import("@logo-platform/shared").DesignRule[];
    graph(): import("@logo-platform/shared").KnowledgeGraphEdge[];
    references(): import("@logo-platform/shared").LogoReference[];
    catalogTaxonomy(): import("@logo-platform/shared").CatalogTaxonomyChapter[];
    catalogStats(): {
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
    caseStudies(): import("@logo-platform/shared").LogoReference[];
    designerProfiles(): import("@logo-platform/shared").LogoReference[];
    catalogSearch(query?: string, chapter?: string, section?: string, era?: string, industry?: string, designer?: string, entryKind?: string, markType?: string): import("@logo-platform/shared").LogoReference[];
    catalogEntry(id: string): import("@logo-platform/shared").LogoReference | null;
    templates(tags?: string): import("@logo-platform/shared").PromptTemplate[];
    byCategory(category: string): import("@logo-platform/shared").DesignRule[];
    one(id: string): import("@logo-platform/shared").DesignRule | undefined;
}
