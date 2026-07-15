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

export type QuotaSummary = {
  limit: number | null;
  used: number;
  reserved: number;
  remaining: number | null;
};

export type UsageSummary = {
  periodStart: string;
  periodEnd: string;
  prompts: QuotaSummary;
  logos: QuotaSummary;
};
