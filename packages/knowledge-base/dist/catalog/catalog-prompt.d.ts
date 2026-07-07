import type { CatalogMarkType, Era, LogoReference } from '@logo-platform/shared';
export interface CatalogPromptContext {
    referenceIds: string[];
    references: LogoReference[];
    principleIds: string[];
    inspirationFragments: string[];
    geometry: string[];
    construction: string[];
    composition: string[];
    typography: string[];
    markTypes: CatalogMarkType[];
    eras: Era[];
}
export declare function buildCatalogPromptContext(referenceIds: string[], options?: {
    narrative?: string;
}): CatalogPromptContext | null;
export declare function getCatalogPrincipleIdsFromContext(referenceIds: string[]): string[];
//# sourceMappingURL=catalog-prompt.d.ts.map