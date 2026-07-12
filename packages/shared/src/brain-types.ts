export type BrainSourceType = 'PDF' | 'IMAGE' | 'FEEDBACK' | 'CATALOG' | 'TEXT';

export type TasteSignalType = 'LIKE' | 'DISLIKE' | 'APPROVE' | 'REJECT' | 'RATING';

export interface BrainExperienceRecord {
  id: string;
  sourceType: BrainSourceType;
  title?: string | null;
  content: string;
  summary?: string | null;
  metadata: Record<string, unknown>;
  filePath?: string | null;
  createdAt: string;
  updatedAt: string;
  similarity?: number;
}

export interface BrainSearchRequest {
  query: string;
  limit?: number;
  sourceType?: BrainSourceType;
  minSimilarity?: number;
}

export interface BrainSearchResult {
  query: string;
  results: BrainExperienceRecord[];
  total: number;
}

export interface BrainFeedbackInput {
  signalType: TasteSignalType;
  score: number;
  context: string;
  experienceId?: string;
  metadata?: Record<string, unknown>;
}

export interface BrainPdfIngestCheck {
  alreadyIngested: boolean;
  existingChunks: number;
  totalChunks: number | null;
  contentHash: string;
  bookTitle: string;
  message: string;
}

export type BrainPdfIngestPhase = 'parsing' | 'processing' | 'done' | 'error';

export type BrainPdfIngestJobStatus =
  | 'queued'
  | 'parsing'
  | 'processing'
  | 'done'
  | 'skipped'
  | 'error';

export interface BrainPdfIngestProgress {
  jobId: string;
  title: string;
  fileName: string;
  contentHash?: string;
  status: BrainPdfIngestJobStatus;
  phase?: BrainPdfIngestPhase;
  pageCount?: number;
  totalChunks?: number;
  processedChunks?: number;
  message?: string;
  result?: BrainIngestResult;
  error?: string;
  startedAt: string;
  finishedAt?: string;
}

export interface BrainPdfIngestStartResult {
  jobId: string;
  status: BrainPdfIngestJobStatus;
  message?: string;
}

export interface BrainIngestResult {
  experienceId: string;
  sourceType: BrainSourceType;
  title?: string;
  chunksStored: number;
  principlesExtracted: number;
  summary?: string;
  skipped?: boolean;
  skippedChunks?: number;
  alreadyIngested?: boolean;
  contentHash?: string;
}

export interface BrainStats {
  experiences: number;
  tasteSignals: number;
  learnedPrinciples: number;
  bySourceType: Record<BrainSourceType, number>;
  embeddingDimensions: number;
  pgvectorEnabled: boolean;
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
  sourceIds: string[];
  antiPatterns: string[];
  tags: string[];
  citations: PrincipleCitation[];
  createdAt: string;
  updatedAt: string;
}

export const LEARNED_PRINCIPLES_SORTS = ['influence_desc', 'influence_asc', 'category'] as const;
export type LearnedPrinciplesSort = (typeof LEARNED_PRINCIPLES_SORTS)[number];

export interface LearnedPrinciplesPage {
  items: LearnedPrincipleRecord[];
  total: number;
}

export interface LearnedPrincipleCategoryCount {
  category: string;
  count: number;
}

export interface BriefInterviewQuestion {
  id: string;
  prompt: string;
  why: string;
  field: keyof BriefContext | 'clientNotes';
  options?: string[];
}

export interface BriefInterviewRequest {
  industry: string;
  companyName?: string;
  briefContext?: BriefContext;
}

export interface BriefInterviewResponse {
  questions: BriefInterviewQuestion[];
  readinessScore: number;
  summary: string;
  clientIntent: import('./client-visual-intent').ClientVisualIntent;
}

export interface BriefContext {
  personality?: string;
  primaryEmotion?: string;
  complexity?: string;
  narrative?: string;
  typography?: string;
  composition?: string;
  constraints?: string;
  geometry?: string;
  construction?: string;
  preferredShapes?: string;
  colorPalette?:
    | 'auto'
    | 'black_white'
    | 'monochrome'
    | 'two_color'
    | 'multi_color'
    | 'corporate_blue'
    | 'red_accent'
    | 'limited'
    | 'custom';
  colorSelections?: string[];
  allowShadows?: boolean;
  allowPhotoreal?: boolean;
  clientNotes?: string;
}

export interface DesignDecisionPrinciple {
  id?: string;
  category: string;
  promptFragment: string;
  weight: number;
}

export interface DesignDecision {
  markType: 'wordmark' | 'lettermark' | 'combination';
  typographyStyle?: 'standard' | 'constructed';
  geometry: string[];
  construction: string[];
  composition: string[];
  typography: string[];
  era: string;
  principles: DesignDecisionPrinciple[];
  antiPatterns: string[];
  catalogReferences: string[];
  reasoning: string;
  promptText: string;
  confidence: number;
}

export interface TasteProfile {
  preferredMarkTypes: string[];
  preferredGeometry: string[];
  preferredColors?: string[];
  preferredRendering?: string[];
  avoidedPatterns: string[];
  averageScore: number;
  signalCount: number;
  summary: string;
}

export interface BrainGenerateRequest {
  industry: string;
  companyName?: string;
  variationCount?: number;
  inspirationMode?: string;
  preferredEra?: string;
  minimalismLevel?: number;
  markType?: 'wordmark' | 'lettermark' | 'combination';
  typographyStyle?: 'standard' | 'constructed';
  analysisPrincipleIds?: string[];
  catalogReferenceIds?: string[];
  catalogNarrative?: string;
  briefContext?: BriefContext;
  useBrain?: boolean;
  /** Force a creative territory instead of auto-selection */
  preferredTerritoryId?: import('./brain-partner').CreativeTerritoryId;
}

export interface BrainConsolidateResult {
  mergedPrinciples: number;
  prunedPrinciples: number;
  deduplicatedExperiences: number;
  updatedWeights: number;
  ranAt: string;
}

export interface BrainCritiqueGenerateRequest extends BrainGenerateRequest {
  maxRetries?: number;
  qualityThreshold?: number;
  generateImage?: boolean;
  imageProvider?: 'openai' | 'mock';
}

export interface BrainCritiqueGenerateResult {
  decision: DesignDecision;
  bestPrompt: import('./types').ComposedPrompt;
  prompts: import('./types').ComposedPrompt[];
  retrievedExperiences: BrainExperienceRecord[];
  tasteProfile: TasteProfile;
  critique: import('./types').DesignCriticResult;
  attempts: number;
  storedExperienceId?: string;
  image?: import('./image-types').ImageGenerationResult;
  brainPowered: true;
}

export type BrainResearchCandidateStatus = 'pending' | 'approved' | 'rejected';

export type BrainResearchSearchSource =
  | 'tavily'
  | 'wikipedia'
  | 'brave'
  | 'archive';

export interface BrainResearchHit {
  url: string;
  title: string;
  snippet: string;
  source: BrainResearchSearchSource;
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
  /** Selected queries used for search (up to 25) */
  generatedQueries: string[];
  /** All brainstormed queries before ranking */
  discoveredQueries: string[];
  hits: BrainResearchHit[];
  candidates: BrainResearchCandidate[];
  skippedUrls: string[];
  /** @deprecated use topic */
  query: string;
}
