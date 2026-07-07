"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    [/flat vector/i, 'flat vector, no gradients, no shadows'],
    [/negative space/i, 'clever meaningful negative space'],
    [/symmetry/i, 'perfect optical symmetry'],
    [/swiss/i, 'Swiss International Style'],
    [/corporate/i, 'timeless corporate identity'],
];
function optimizePrompt(text, principles) {
    let result = text;
    result = removeDuplicates(result);
    result = removeContradictions(result);
    result = removeFiller(result);
    result = strengthenPrompt(result);
    result = enforceRestrictions(result, principles);
    result = normalizePunctuation(result);
    return result;
}
function removeDuplicates(text) {
    const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    const seen = new Set();
    const unique = [];
    for (const sentence of sentences) {
        const key = sentence.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(sentence);
        }
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
function strengthenPrompt(text) {
    let result = text;
    for (const [pattern, replacement] of STRENGTHENERS) {
        if (pattern.test(result) && !result.includes(replacement)) {
            result = result.replace(pattern, replacement);
        }
    }
    return result;
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
    for (const r of restrictions) {
        if (!result.toLowerCase().includes(r)) {
            result += `. ${r.charAt(0).toUpperCase() + r.slice(1)}`;
        }
    }
    return result;
}
function normalizePunctuation(text) {
    return text
        .replace(/\s+/g, ' ')
        .replace(/\.+/g, '.')
        .replace(/\.\s*$/, '')
        .trim() + '.';
}
function detectPromptIssues(text) {
    const issues = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    const seen = new Set();
    for (const s of sentences) {
        const key = s.toLowerCase();
        if (seen.has(key))
            issues.push(`Duplicate: "${s}"`);
        seen.add(key);
    }
    for (const [a, b] of CONTRADICTIONS) {
        if (a.test(text) && b.test(text)) {
            issues.push(`Contradiction between "${a.source}" and "${b.source}"`);
        }
    }
    if (text.length > 500)
        issues.push('Prompt may be too long for image models');
    if (text.length < 50)
        issues.push('Prompt may be too short');
    return issues;
}
//# sourceMappingURL=prompt-optimizer.js.map