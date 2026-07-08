export interface TasteProfile {
  preferredMarkTypes: string[];
  preferredGeometry: string[];
  avoidedPatterns: string[];
  averageScore: number;
  signalCount: number;
  summary: string;
}

export interface BrainExperienceRecord {
  id: string;
  sourceType: 'PDF' | 'IMAGE' | 'FEEDBACK' | 'CATALOG' | 'TEXT';
  title?: string | null;
  content: string;
  summary?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  similarity?: number;
}

export interface BrainStats {
  experiences: number;
  tasteSignals: number;
  learnedPrinciples: number;
  bySourceType: Record<string, number>;
  embeddingDimensions: number;
  pgvectorEnabled: boolean;
}

export interface BrainCapabilities {
  embeddingConfigured: boolean;
  databaseConfigured: boolean;
  nightlyConsolidate?: boolean;
  nightlyResearch?: boolean;
  tavilyConfigured?: boolean;
  braveConfigured?: boolean;
  ocrConfigured?: boolean;
  trustedDomains?: string[];
}

export interface PrincipleCitation {
  url: string;
  quote: string;
}

export interface LearnedPrincipleRecord {
  id: string;
  category: string;
  ruleText: string;
  promptFragment: string;
  weight: number;
  confidence: number;
  citations?: PrincipleCitation[];
}

export interface BrainPdfIngestCheck {
  alreadyIngested: boolean;
  existingChunks: number;
  totalChunks: number | null;
  contentHash: string;
  bookTitle: string;
  message: string;
}

export interface BrainIngestResult {
  experienceId: string;
  sourceType: string;
  title?: string;
  chunksStored: number;
  principlesExtracted: number;
  summary?: string;
  skipped?: boolean;
  skippedChunks?: number;
  alreadyIngested?: boolean;
  contentHash?: string;
}

export interface BrainConsolidateResult {
  mergedPrinciples: number;
  prunedPrinciples: number;
  deduplicatedExperiences: number;
  updatedWeights: number;
  ranAt: string;
}

export type BrainResearchCandidateStatus = 'pending' | 'approved' | 'rejected';

export interface BrainResearchHit {
  url: string;
  title: string;
  snippet: string;
  source: 'tavily' | 'wikipedia' | 'brave' | 'archive';
  searchQuery?: string;
  sourceScore?: number;
}

export interface BrainResearchPrinciplePreview {
  category: string;
  ruleText: string;
  promptFragment: string;
  confidence: number;
  antiPatterns?: string[];
  tags?: string[];
  citationUrl?: string;
  citationQuote?: string;
}

export interface BrainResearchCandidate {
  id: string;
  query: string;
  status: BrainResearchCandidateStatus;
  sourceUrl: string;
  sourceTitle: string;
  snippet: string;
  summary: string;
  extractedText: string;
  principles: BrainResearchPrinciplePreview[];
  sourceScore?: number;
  createdAt: string;
  reviewedAt?: string;
  ingestResult?: BrainIngestResult;
}

export interface BrainResearchRunResult {
  topic: string;
  generatedQueries: string[];
  discoveredQueries: string[];
  hits: BrainResearchHit[];
  candidates: BrainResearchCandidate[];
  skippedUrls: string[];
  query: string;
}
