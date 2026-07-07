import type { DesignRule, LogoMarkType, TypographyStyle } from '@logo-platform/shared';
export interface MarkTypeFilterOptions {
    typographyStyle?: TypographyStyle;
}
export declare function isPrincipleAllowedForMarkType(rule: DesignRule, markType?: LogoMarkType, options?: MarkTypeFilterOptions): boolean;
export declare function filterPrinciplesForMarkType(rules: DesignRule[], markType?: LogoMarkType, options?: MarkTypeFilterOptions): DesignRule[];
export declare function shouldSkipCategoryForMarkType(category: DesignRule['category'], markType?: LogoMarkType, options?: MarkTypeFilterOptions): boolean;
export declare function filterPrincipleIdsForMarkType(ids: string[], markType?: LogoMarkType): string[];
//# sourceMappingURL=mark-type-filter.d.ts.map