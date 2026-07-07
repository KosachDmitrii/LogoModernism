import type { CatalogSearchFilters, LogoReference } from '@logo-platform/shared';
import { CATALOG_TAXONOMY, CASE_STUDY_IDS, DESIGNER_PROFILE_IDS } from './taxonomy';
export declare function getFullCatalog(): LogoReference[];
export { CATALOG_TAXONOMY, CASE_STUDY_IDS, DESIGNER_PROFILE_IDS };
export declare const LOGO_CATALOG: LogoReference[];
export declare function getCatalogTaxonomy(): import("@logo-platform/shared").CatalogTaxonomyChapter[];
export declare function getCatalogStats(): {
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
export declare function getCatalogEntry(id: string): LogoReference | undefined;
export declare function getCatalogByChapter(chapter: string): LogoReference[];
export declare function getCatalogBySection(chapter: string, section: string): LogoReference[];
export declare function getCaseStudies(): LogoReference[];
export declare function getDesignerProfiles(): LogoReference[];
export declare function searchCatalog(filters: CatalogSearchFilters): LogoReference[];
export declare function matchCatalogToDescription(description: string, limit?: number): LogoReference[];
export declare function getCatalogPrincipleIds(referenceIds: string[]): string[];
export { buildCatalogPromptContext, getCatalogPrincipleIdsFromContext } from './catalog-prompt';
export type { CatalogPromptContext } from './catalog-prompt';
/** Backward-compatible alias */
export declare const logoReferences: LogoReference[];
//# sourceMappingURL=index.d.ts.map