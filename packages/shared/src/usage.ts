export const USAGE_OPERATIONS = {
  promptCompose: 'prompt.compose',
  promptRecommend: 'prompt.recommend',
  imageGenerate: 'image.generate',
  brainInterview: 'brain.interview',
  brainIngestImage: 'brain.ingest.image',
  brainIngestPdf: 'brain.ingest.pdf',
  brainResearchPreview: 'brain.research.preview',
  brainResearchStandard: 'brain.research.standard',
  brainResearchDeep: 'brain.research.deep',
} as const;

export type UsageOperationKey = (typeof USAGE_OPERATIONS)[keyof typeof USAGE_OPERATIONS];

export const USAGE_OPERATION_COSTS: Record<UsageOperationKey, number> = {
  [USAGE_OPERATIONS.promptCompose]: 2,
  [USAGE_OPERATIONS.promptRecommend]: 1,
  [USAGE_OPERATIONS.imageGenerate]: 10,
  [USAGE_OPERATIONS.brainInterview]: 1,
  [USAGE_OPERATIONS.brainIngestImage]: 5,
  [USAGE_OPERATIONS.brainIngestPdf]: 25,
  [USAGE_OPERATIONS.brainResearchPreview]: 5,
  [USAGE_OPERATIONS.brainResearchStandard]: 25,
  [USAGE_OPERATIONS.brainResearchDeep]: 45,
};

export type UsageSummary = {
  periodStart: string;
  periodEnd: string;
  includedCredits: number | null;
  committedCredits: number;
  reservedCredits: number;
  purchasedCredits: number;
  remainingCredits: number | null;
};
