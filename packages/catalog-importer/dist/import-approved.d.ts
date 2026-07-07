import type { CatalogCandidate, LogoReference } from '@logo-platform/shared';
export declare function candidateToLogoReference(c: CatalogCandidate): LogoReference;
export declare function importApprovedToCatalog(): LogoReference[];
export declare function approveCandidate(candidates: CatalogCandidate[], id: string, patch?: Partial<CatalogCandidate>): CatalogCandidate[];
export declare function rejectCandidate(candidates: CatalogCandidate[], id: string, notes?: string): CatalogCandidate[];
export declare function bulkRejectCandidates(candidates: CatalogCandidate[], ids: string[], notes?: string): CatalogCandidate[];
//# sourceMappingURL=import-approved.d.ts.map