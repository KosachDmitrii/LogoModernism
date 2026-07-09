import type { DesignRule, LogoMarkType, TypographyStyle } from '@logo-platform/shared';
import { hasExplicitBrandName } from '@logo-platform/shared';

export interface MarkTypeFilterOptions {
  typographyStyle?: TypographyStyle;
  companyName?: string | null;
}

const WORDMARK_SKIP_CATEGORIES = new Set<DesignRule['category']>([
  'geometry',
  'construction',
  'grid',
  'mark_type',
]);

const LETTERMARK_SKIP_CATEGORIES = new Set<DesignRule['category']>([
  'geometry',
  'construction',
  'grid',
]);

const CONSTRUCTED_ALLOW_CATEGORIES = new Set<DesignRule['category']>(['grid', 'construction']);

const SYMBOL_ONLY_SKIP_CATEGORIES = new Set<DesignRule['category']>(['typography']);

const SYMBOL_ONLY_BLOCKED_IDS = new Set([
  'typ-initials',
  'typ-wordmark',
  'typ-monogram',
  'typ-custom-letterform',
  'mark-lettermark',
]);

const SYMBOL_ONLY_FRAGMENT =
  /\b(lettermark|wordmark|monogram|bold initials|standalone initial|custom wordmark|typographic logotype)\b/i;

const TEXTUAL_BRAND_MARK_TYPES = new Set<LogoMarkType>(['wordmark', 'lettermark', 'combination']);

const BLOCKED_FOR_TEXTUAL_BRAND = new Set([
  'mar-extra-numeric',
  'geo-extra-capsule',
  'mark-emblem',
]);

const BLOCKED_IDS: Record<LogoMarkType, Set<string>> = {
  wordmark: new Set([
    'mark-symbol-only',
    'mark-iconic-symbol',
    'mark-abstract-symbol',
    'mark-emblem',
    'mark-combination-mark',
    'mark-lettermark',
    'mark-corporate-mark',
    'mark-heraldic',
    'typ-monogram',
    'mark-pictogram',
    'mark-iconic-symbol',
  ]),
  lettermark: new Set([
    'mark-symbol-only',
    'mark-iconic-symbol',
    'mark-abstract-symbol',
    'mark-combination-mark',
    'mark-emblem',
    'mark-heraldic',
    'mark-pictogram',
    'typ-wordmark',
  ]),
  combination: new Set(),
};

const SYMBOL_FRAGMENT =
  /\b(standalone symbol|iconic symbol|abstract symbol|pictogram|emblem|badge|ribbon|banner|shield|heraldic|crest|seal|lettermark|monogram|symbol and wordmark)\b/i;

const LETTERMARK_SYMBOL_FRAGMENT =
  /\b(standalone symbol|iconic symbol|abstract symbol|pictogram|emblem|badge|ribbon|banner|shield|heraldic|crest|seal|symbol and wordmark|wordmark)\b/i;

function isConstructed(options?: MarkTypeFilterOptions): boolean {
  return options?.typographyStyle === 'constructed';
}

function isSymbolOnlyMode(markType?: LogoMarkType, options?: MarkTypeFilterOptions): boolean {
  return !markType && !hasExplicitBrandName(options?.companyName);
}

function shouldSkipCategory(
  category: DesignRule['category'],
  markType?: LogoMarkType,
  options?: MarkTypeFilterOptions,
): boolean {
  if (isSymbolOnlyMode(markType, options) && SYMBOL_ONLY_SKIP_CATEGORIES.has(category)) {
    return true;
  }

  if (!markType) return false;

  if (isConstructed(options) && CONSTRUCTED_ALLOW_CATEGORIES.has(category)) {
    return false;
  }

  if (markType === 'wordmark') return WORDMARK_SKIP_CATEGORIES.has(category);
  if (markType === 'lettermark') return LETTERMARK_SKIP_CATEGORIES.has(category);
  return false;
}

export function isPrincipleAllowedForMarkType(
  rule: DesignRule,
  markType?: LogoMarkType,
  options?: MarkTypeFilterOptions,
): boolean {
  if (isSymbolOnlyMode(markType, options)) {
    if (SYMBOL_ONLY_SKIP_CATEGORIES.has(rule.category)) return false;
    if (SYMBOL_ONLY_BLOCKED_IDS.has(rule.id)) return false;
    if (SYMBOL_ONLY_FRAGMENT.test(rule.promptFragment)) return false;
  }

  if (!markType) return true;

  if (shouldSkipCategory(rule.category, markType, options)) {
    return false;
  }

  if (BLOCKED_IDS[markType].has(rule.id)) {
    return false;
  }

  if (
    markType &&
    TEXTUAL_BRAND_MARK_TYPES.has(markType) &&
    hasExplicitBrandName(options?.companyName) &&
    BLOCKED_FOR_TEXTUAL_BRAND.has(rule.id)
  ) {
    return false;
  }

  if (!isConstructed(options)) {
    if (markType === 'wordmark' && SYMBOL_FRAGMENT.test(rule.promptFragment)) {
      return false;
    }
    if (markType === 'lettermark' && LETTERMARK_SYMBOL_FRAGMENT.test(rule.promptFragment)) {
      return false;
    }
    if (markType === 'wordmark' && rule.category === 'composition') {
      const fragment = rule.promptFragment.toLowerCase();
      if (/stacked|vertical|overlay|nested|solid fill/.test(fragment)) {
        return false;
      }
    }
  } else if (markType === 'wordmark' || markType === 'lettermark') {
    if (rule.category === 'geometry') return false;
    if (rule.category === 'mark_type') return false;
    if (SYMBOL_FRAGMENT.test(rule.promptFragment)) return false;
  }

  return true;
}

export function filterPrinciplesForMarkType(
  rules: DesignRule[],
  markType?: LogoMarkType,
  options?: MarkTypeFilterOptions,
): DesignRule[] {
  return rules.filter((rule) => isPrincipleAllowedForMarkType(rule, markType, options));
}

export function shouldSkipCategoryForMarkType(
  category: DesignRule['category'],
  markType?: LogoMarkType,
  options?: MarkTypeFilterOptions,
): boolean {
  return shouldSkipCategory(category, markType, options);
}

export function filterPrincipleIdsForMarkType(
  ids: string[],
  markType?: LogoMarkType,
): string[] {
  if (!markType) return ids;
  return ids.filter((id) => {
    const blocked = BLOCKED_IDS[markType];
    return !blocked.has(id);
  });
}
