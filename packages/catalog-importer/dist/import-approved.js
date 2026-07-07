"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidateToLogoReference = candidateToLogoReference;
exports.importApprovedToCatalog = importApprovedToCatalog;
exports.approveCandidate = approveCandidate;
exports.rejectCandidate = rejectCandidate;
exports.bulkRejectCandidates = bulkRejectCandidates;
const storage_1 = require("./storage");
function candidateToLogoReference(c) {
    return {
        id: `ref-import-${c.id.replace(/^cand-/, '')}`,
        name: c.name,
        designer: c.designer,
        year: c.year,
        country: c.country,
        industry: c.industry,
        construction: c.construction,
        shape: c.geometry,
        geometry: c.geometry,
        composition: c.composition,
        grid: c.construction.filter((x) => x.includes('grid')),
        negativeSpace: c.composition.filter((x) => x.includes('negative')),
        typography: c.typography,
        stroke: ['equal-width'],
        weight: ['medium'],
        symmetry: ['bilateral'],
        colorCount: c.colorCount,
        visualComplexity: c.visualComplexity,
        minimalismLevel: c.minimalismLevel,
        era: c.era ?? 'international_style',
        keywords: c.keywords,
        principleIds: c.principleIds,
        catalogChapter: c.catalogChapter,
        catalogSection: c.catalogSection,
        entryKind: c.entryKind ?? 'logo',
        markType: c.markType,
        significance: c.significance,
        bookPageHint: `Page ${c.sourcePage}`,
    };
}
function importApprovedToCatalog() {
    return (0, storage_1.loadApproved)().map(candidateToLogoReference);
}
function approveCandidate(candidates, id, patch) {
    const approved = (0, storage_1.loadApproved)();
    const updated = candidates.map((c) => {
        if (c.id !== id)
            return c;
        const merged = { ...c, ...patch, status: 'approved', reviewedAt: new Date().toISOString() };
        if (!approved.some((a) => a.id === id)) {
            approved.push(merged);
        }
        else {
            const idx = approved.findIndex((a) => a.id === id);
            approved[idx] = merged;
        }
        (0, storage_1.saveApproved)(approved);
        return merged;
    });
    return updated;
}
function rejectCandidate(candidates, id, notes) {
    const approved = (0, storage_1.loadApproved)().filter((a) => a.id !== id);
    (0, storage_1.saveApproved)(approved);
    return candidates.map((c) => c.id === id
        ? { ...c, status: 'rejected', reviewedAt: new Date().toISOString(), reviewNotes: notes }
        : c);
}
function bulkRejectCandidates(candidates, ids, notes) {
    if (!ids.length)
        return candidates;
    const idSet = new Set(ids);
    const approved = (0, storage_1.loadApproved)().filter((a) => !idSet.has(a.id));
    (0, storage_1.saveApproved)(approved);
    const reviewedAt = new Date().toISOString();
    return candidates.map((c) => idSet.has(c.id)
        ? { ...c, status: 'rejected', reviewedAt, reviewNotes: notes }
        : c);
}
//# sourceMappingURL=import-approved.js.map