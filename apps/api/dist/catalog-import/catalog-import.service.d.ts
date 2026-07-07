import type { CatalogCandidate } from '@logo-platform/shared';
export declare class CatalogImportService {
    getStats(): import("@logo-platform/shared").CatalogPipelineStats;
    getPagesIndex(): import("@logo-platform/catalog-importer").PagesIndex | null;
    listCandidates(status?: string): CatalogCandidate[];
    getCandidate(id: string): CatalogCandidate;
    updateCandidate(id: string, patch: Partial<CatalogCandidate>): CatalogCandidate;
    approve(id: string, patch?: Partial<CatalogCandidate>): CatalogCandidate | undefined;
    reject(id: string, notes?: string): CatalogCandidate | undefined;
    bulkReject(ids: string[], notes?: string): {
        count: number;
        path: string;
        rejected: number;
    };
    bulkApprove(ids: string[]): {
        count: number;
        path: string;
        approved: number;
    };
    listApproved(): CatalogCandidate[];
    syncImportedCatalog(): {
        count: number;
        path: string;
    };
    getPageImagePath(filename: string): string | null;
    createPageImageStream(filename: string): import("fs").ReadStream;
}
