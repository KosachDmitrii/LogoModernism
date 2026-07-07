"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPrincipleAllowedForMarkType = isPrincipleAllowedForMarkType;
exports.filterPrinciplesForMarkType = filterPrinciplesForMarkType;
exports.shouldSkipCategoryForMarkType = shouldSkipCategoryForMarkType;
exports.filterPrincipleIdsForMarkType = filterPrincipleIdsForMarkType;
const WORDMARK_SKIP_CATEGORIES = new Set([
    'geometry',
    'construction',
    'grid',
    'mark_type',
]);
const LETTERMARK_SKIP_CATEGORIES = new Set([
    'geometry',
    'construction',
    'grid',
]);
const CONSTRUCTED_ALLOW_CATEGORIES = new Set(['grid', 'construction']);
const BLOCKED_IDS = {
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
const SYMBOL_FRAGMENT = /\b(standalone symbol|iconic symbol|abstract symbol|pictogram|emblem|badge|ribbon|banner|shield|heraldic|crest|seal|lettermark|monogram|symbol and wordmark)\b/i;
const LETTERMARK_SYMBOL_FRAGMENT = /\b(standalone symbol|iconic symbol|abstract symbol|pictogram|emblem|badge|ribbon|banner|shield|heraldic|crest|seal|symbol and wordmark|wordmark)\b/i;
function isConstructed(options) {
    return options?.typographyStyle === 'constructed';
}
function shouldSkipCategory(category, markType, options) {
    if (!markType)
        return false;
    if (isConstructed(options) && CONSTRUCTED_ALLOW_CATEGORIES.has(category)) {
        return false;
    }
    if (markType === 'wordmark')
        return WORDMARK_SKIP_CATEGORIES.has(category);
    if (markType === 'lettermark')
        return LETTERMARK_SKIP_CATEGORIES.has(category);
    return false;
}
function isPrincipleAllowedForMarkType(rule, markType, options) {
    if (!markType)
        return true;
    if (shouldSkipCategory(rule.category, markType, options)) {
        return false;
    }
    if (BLOCKED_IDS[markType].has(rule.id)) {
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
    }
    else if (markType === 'wordmark' || markType === 'lettermark') {
        if (rule.category === 'geometry')
            return false;
        if (rule.category === 'mark_type')
            return false;
        if (SYMBOL_FRAGMENT.test(rule.promptFragment))
            return false;
    }
    return true;
}
function filterPrinciplesForMarkType(rules, markType, options) {
    return rules.filter((rule) => isPrincipleAllowedForMarkType(rule, markType, options));
}
function shouldSkipCategoryForMarkType(category, markType, options) {
    return shouldSkipCategory(category, markType, options);
}
function filterPrincipleIdsForMarkType(ids, markType) {
    if (!markType)
        return ids;
    return ids.filter((id) => {
        const blocked = BLOCKED_IDS[markType];
        return !blocked.has(id);
    });
}
//# sourceMappingURL=mark-type-filter.js.map