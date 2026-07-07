"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeClauseKey = normalizeClauseKey;
exports.significantTokens = significantTokens;
exports.clauseOverlaps = clauseOverlaps;
exports.optimizePrompt = optimizePrompt;
exports.detectPromptIssues = detectPromptIssues;
const CONTRADICTIONS = [
    [/single color/i, /two.?color/i],
    [/no gradients?/i, /gradient/i],
    [/minimal complexity/i, /dense/i],
    [/no shadows/i, /shadow/i],
    [/outline only/i, /solid fill/i],
    [/asymmetric/i, /perfect symmetry/i],
];
const FILLER_PHRASES = [
    /\bvery\b/gi,
    /\breally\b/gi,
    /\bquite\b/gi,
    /\bextremely\b/gi,
    /\bbeautiful\b/gi,
    /\bstunning\b/gi,
    /\bamazing\b/gi,
];
const STRENGTHENERS = [
    { test: /\bflat vector\b/i, phrase: 'no gradients, no shadows' },
    { test: /\bnegative space\b/i, phrase: 'clever meaningful negative space' },
    { test: /\bsymmetry\b/i, phrase: 'perfect optical symmetry' },
    { test: /\bswiss\b/i, phrase: 'Swiss International Style' },
    { test: /\bcorporate\b/i, phrase: 'timeless corporate identity' },
];
const TOKEN_STOP_WORDS = new Set([
    'built',
    'from',
    'with',
    'that',
    'this',
    'only',
    'pure',
    'very',
    'into',
    'using',
    'based',
]);
function normalizeClauseKey(clause) {
    return clause
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
function significantTokens(text) {
    return new Set(text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((word) => word.length > 3 && !TOKEN_STOP_WORDS.has(word)));
}
function clauseOverlaps(a, b) {
    const left = normalizeClauseKey(a);
    const right = normalizeClauseKey(b);
    if (!left || !right)
        return false;
    if (left === right)
        return true;
    if (left.length > 8 && right.length > 8 && (left.includes(right) || right.includes(left))) {
        return true;
    }
    const tokensA = significantTokens(a);
    const tokensB = significantTokens(b);
    if (tokensA.size === 0 || tokensB.size === 0)
        return false;
    let shared = 0;
    for (const token of tokensA) {
        if (tokensB.has(token))
            shared++;
    }
    return shared / Math.min(tokensA.size, tokensB.size) >= 0.65;
}
function optimizePrompt(text, principles) {
    let result = text;
    result = removeDuplicates(result);
    result = removeContradictions(result);
    result = removeFiller(result);
    result = strengthenPrompt(result);
    result = enforceRestrictions(result, principles);
    result = normalizePunctuation(result);
    result = collapseRepeatedWords(result);
    return result;
}
function splitClauses(text) {
    return text
        .split(/(?<=\.)\s+|,\s+/)
        .map((clause) => clause.trim().replace(/\.+$/, ''))
        .filter(Boolean);
}
function dedupeClauses(text) {
    const unique = [];
    for (const clause of splitClauses(text)) {
        if (unique.some((existing) => clauseOverlaps(existing, clause)))
            continue;
        unique.push(clause);
    }
    return unique.join(', ');
}
function removeDuplicates(text) {
    const sentences = text
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);
    const unique = [];
    for (const sentence of sentences) {
        const dedupedSentence = dedupeClauses(sentence);
        if (!dedupedSentence)
            continue;
        if (unique.some((existing) => clauseOverlaps(existing, dedupedSentence)))
            continue;
        unique.push(dedupedSentence);
    }
    return unique.join('. ');
}
function removeContradictions(text) {
    let result = text;
    for (const [a, b] of CONTRADICTIONS) {
        if (a.test(result) && b.test(result)) {
            result = result
                .replace(new RegExp(`(?<!no\\s)${b.source}`, b.flags), '')
                .replace(/\s+/g, ' ')
                .trim();
        }
    }
    return result;
}
function removeFiller(text) {
    let result = text;
    for (const pattern of FILLER_PHRASES) {
        result = result.replace(pattern, '').replace(/\s+/g, ' ').trim();
    }
    return result;
}
function conceptMostlyPresent(text, phrase) {
    const phraseTokens = significantTokens(phrase);
    const textTokens = significantTokens(text);
    if (phraseTokens.size === 0)
        return true;
    let shared = 0;
    for (const token of phraseTokens) {
        if (textTokens.has(token))
            shared++;
    }
    return shared / phraseTokens.size >= 0.75;
}
function strengthenPrompt(text) {
    const additions = [];
    for (const { test, phrase } of STRENGTHENERS) {
        if (!test.test(text))
            continue;
        if (conceptMostlyPresent(text, phrase))
            continue;
        if (additions.some((existing) => clauseOverlaps(existing, phrase)))
            continue;
        additions.push(phrase);
    }
    if (additions.length === 0)
        return text;
    return `${text}, ${additions.join(', ')}`;
}
function enforceRestrictions(text, principles) {
    const restrictions = [];
    const ids = new Set(principles.map((p) => p.id));
    if (ids.has('color-no-gradient') || ids.has('fx-gradient-avoid')) {
        restrictions.push('no gradients');
    }
    if (ids.has('render-no-shadows') || ids.has('fx-shadow-avoid')) {
        restrictions.push('no shadows');
    }
    if (ids.has('color-one-color')) {
        restrictions.push('single color');
    }
    if (ids.has('render-flat-vector')) {
        restrictions.push('flat vector');
    }
    let result = text;
    for (const restriction of restrictions) {
        if (!conceptMostlyPresent(result, restriction)) {
            result += `, ${restriction}`;
        }
    }
    return result;
}
function normalizePunctuation(text) {
    return (text
        .replace(/\s+/g, ' ')
        .replace(/,\s*,+/g, ', ')
        .replace(/:\s*,+/g, ': ')
        .replace(/Avoid:\s*\./gi, '')
        .replace(/Avoid:\s*$/gi, '')
        .replace(/,\s*\./g, '.')
        .replace(/\.+/g, '.')
        .replace(/\s+,/g, ',')
        .replace(/,\s*$/g, '')
        .replace(/\.\s*$/, '')
        .trim() + '.');
}
function collapseRepeatedWords(text) {
    let result = text;
    let previous = '';
    while (result !== previous) {
        previous = result;
        result = result.replace(/\b(\w+)(\s+\1\b)+/gi, '$1');
    }
    return result;
}
function detectPromptIssues(text) {
    const issues = [];
    const clauses = splitClauses(text);
    const seen = [];
    for (const clause of clauses) {
        if (seen.some((existing) => clauseOverlaps(existing, clause))) {
            issues.push(`Duplicate: "${clause}"`);
        }
        seen.push(clause);
    }
    for (const [a, b] of CONTRADICTIONS) {
        if (a.test(text) && b.test(text)) {
            issues.push(`Contradiction between "${a.source}" and "${b.source}"`);
        }
    }
    if (/\b(\w+)\s+\1\b/i.test(text)) {
        issues.push('Repeated adjacent words detected');
    }
    if (text.length > 500)
        issues.push('Prompt may be too long for image models');
    if (text.length < 50)
        issues.push('Prompt may be too short');
    return issues;
}
//# sourceMappingURL=prompt-optimizer.js.map