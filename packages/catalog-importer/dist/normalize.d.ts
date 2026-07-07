import type { CatalogChapter, CatalogMarkType, Era } from '@logo-platform/shared';
export interface VisionLogoEntry {
    name: string;
    industry?: string;
    designer?: string;
    year?: number;
    country?: string;
    section_hint?: string;
    page_section?: string;
    geometry?: string[];
    composition?: string[];
    construction?: string[];
    typography?: string[];
    mark_type?: string;
    era?: string;
    minimalism_level?: number;
    visual_complexity?: string;
    color_count?: number;
    significance?: string;
    keywords?: string[];
}
export declare function normalizeSection(raw?: string): string | undefined;
export declare function normalizeEra(raw?: string, year?: number): Era;
export declare function normalizeMarkType(raw?: string): CatalogMarkType | undefined;
export declare function inferPrincipleIds(entry: VisionLogoEntry): string[];
export declare function chapterFromSection(section?: string): CatalogChapter | undefined;
export declare function parseVisionResponse(content: string): VisionLogoEntry[];
//# sourceMappingURL=normalize.d.ts.map