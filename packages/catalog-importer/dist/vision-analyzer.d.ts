import type { CatalogCandidate } from '@logo-platform/shared';
export interface AnalyzePageOptions {
    page: number;
    pageImagePath: string;
    model?: string;
}
export declare function analyzePageWithVision(options: AnalyzePageOptions): Promise<CatalogCandidate[]>;
export declare function analyzePages(pages: Array<{
    page: number;
    file: string;
}>, options?: {
    model?: string;
    onProgress?: (page: number, count: number) => void;
}): Promise<CatalogCandidate[]>;
//# sourceMappingURL=vision-analyzer.d.ts.map