import type { DesignRule } from '@logo-platform/shared';
export declare function normalizeClauseKey(clause: string): string;
export declare function significantTokens(text: string): Set<string>;
export declare function clauseOverlaps(a: string, b: string): boolean;
export declare function optimizePrompt(text: string, principles: DesignRule[]): string;
export declare function detectPromptIssues(text: string): string[];
//# sourceMappingURL=prompt-optimizer.d.ts.map