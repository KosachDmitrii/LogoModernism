import type { CatalogCandidate, CatalogPipelineStats } from '@logo-platform/shared';
export declare const PIPELINE_DIR: string;
export declare const CANDIDATES_FILE: string;
export declare const PAGES_INDEX_FILE: string;
export declare const APPROVED_FILE: string;
export interface PagesIndex {
    pdfPath: string;
    totalPages: number;
    extractedRange?: {
        start: number;
        end: number;
    };
    scale: number;
    pages: Array<{
        page: number;
        file: string;
        width: number;
        height: number;
    }>;
}
export declare function ensurePipelineDir(): void;
export declare function loadPagesIndex(): PagesIndex | null;
export declare function loadCandidates(): CatalogCandidate[];
export declare function saveCandidates(candidates: CatalogCandidate[]): void;
export declare function loadApproved(): CatalogCandidate[];
export declare function saveApproved(approved: CatalogCandidate[]): void;
export declare function getPipelineStats(): CatalogPipelineStats;
export declare function slugify(text: string): string;
export declare function candidateId(page: number, index: number, name: string): string;
//# sourceMappingURL=storage.d.ts.map