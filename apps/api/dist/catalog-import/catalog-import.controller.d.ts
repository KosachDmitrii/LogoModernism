import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import type { CatalogCandidate } from '@logo-platform/shared';
import { CatalogImportService } from './catalog-import.service';
export declare class CatalogImportController {
    private readonly service;
    constructor(service: CatalogImportService);
    stats(): import("@logo-platform/shared").CatalogPipelineStats;
    pagesIndex(): import("@logo-platform/catalog-importer").PagesIndex | null;
    candidates(status?: string): CatalogCandidate[];
    one(id: string): CatalogCandidate;
    update(id: string, patch: Partial<CatalogCandidate>): CatalogCandidate;
    approve(id: string, patch?: Partial<CatalogCandidate>): CatalogCandidate | undefined;
    reject(id: string, body?: {
        notes?: string;
    }): CatalogCandidate | undefined;
    bulkApprove(body: {
        ids: string[];
    }): {
        count: number;
        path: string;
        approved: number;
    };
    bulkReject(body: {
        ids: string[];
        notes?: string;
    }): {
        count: number;
        path: string;
        rejected: number;
    };
    approved(): CatalogCandidate[];
    syncCatalog(): {
        count: number;
        path: string;
    };
    servePage(filename: string, res: Response): StreamableFile;
}
