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
    templates(tags?: string): import("@logo-platform/shared").PromptTemplate[];
    byCategory(category: string): import("@logo-platform/shared").DesignRule[];
    one(id: string): import("@logo-platform/shared").DesignRule | undefined;
}
