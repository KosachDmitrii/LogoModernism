export interface PromptScores {
  modernismScore: number;
  swissScore: number;
  minimalismScore: number;
  geometryScore: number;
  readabilityScore: number;
  scalabilityScore: number;
  brandRecognitionScore: number;
  cohesionScore: number;
  identityScore: number;
  promptQuality: number;
}

export interface DesignRule {
  id: string;
  name: string;
  category: string;
  description: string;
  promptFragment: string;
}

export interface LogoDNA {
  geometry: string[];
  construction: string[];
  balance: string[];
  complexity: string;
  era: string;
  typography: string[];
  recognition: number;
  minimalism: number;
  visualWeight: string[];
  harmony: string[];
}

export interface CreativeTerritory {
  id: string;
  name: string;
  thesis: string;
  markArchitecture: string;
  constructionFocus: string;
  typographyFocus: string;
  colorApproach: string;
  confidence: number;
  tradeoffs: string[];
}

export type CreativeTerritoryId =
  | 'territory-primary'
  | 'territory-construction'
  | 'territory-typography';

export type PromptCountOption = 1 | 3 | 5;

export interface ConstraintConflictSide {
  role: 'brief' | 'output';
  fieldKey: string;
  value: string;
  excerpt?: string;
}

export interface ConstraintResolutionPatch {
  colorPalette?: DesignBrief['colorPalette'];
  allowShadows?: boolean;
  allowPhotoreal?: boolean;
  markType?: DesignBrief['markType'];
  appendConstraints?: string;
  appendClientNotes?: string;
}

export interface ConstraintResolutionCompose {
  preferredTerritoryId?: CreativeTerritoryId;
  appendConstraints?: string;
}

export interface ConstraintResolution {
  id: string;
  briefPatch?: ConstraintResolutionPatch;
  compose?: ConstraintResolutionCompose;
}

export interface ConstraintReport {
  passed: boolean;
  score: number;
  violations: Array<{
    id: string;
    code: string;
    severity: 'error' | 'warning';
    message: string;
    suggestion?: string;
    briefSide?: ConstraintConflictSide;
    outputSide?: ConstraintConflictSide;
    resolutions?: ConstraintResolution[];
  }>;
}

export interface CatalogIntelligenceResult {
  referenceIds: string[];
  recommendations: Array<{ id: string; name: string; industryScore: number }>;
  narrative: string;
  autoSelected: boolean;
}

export interface DesignCriticResult {
  recognizability: number;
  scalability: number;
  balance: number;
  contrast: number;
  simplicity: number;
  modernity: number;
  registrability: number;
  overallScore: number;
  feedback: string[];
}

export interface BrainPartnerState {
  partnerMode: true;
  creativeTerritories: CreativeTerritory[];
  selectedTerritoryId: string;
  constraintReport: ConstraintReport;
  critique?: DesignCriticResult;
  catalogIntelligence: CatalogIntelligenceResult;
  partnerAttempts: number;
  territorySelectionMode: 'auto' | 'manual';
}

export interface ComposedPrompt {
  id: string;
  text: string;
  industry: string;
  companyName?: string;
  selectedPrinciples: DesignRule[];
  scores: PromptScores;
  dna: LogoDNA;
  logos?: GeneratedImage[];
  saved?: boolean;
  savedAt?: string;
  /** @deprecated use saved + logo feedback */
  feedback?: 'LIKE' | 'DISLIKE';
  rank?: number;
  metadata: {
    era: string;
    variationIndex?: number;
    inspirationMode?: string;
    markType?: 'wordmark' | 'lettermark' | 'combination';
    typographyStyle?: 'standard' | 'constructed';
    briefCoverage?: BriefFieldCoverage[];
    stylePreferences?: BriefContextPayload;
    brainPowered?: boolean;
    reasoning?: string;
    confidence?: number;
    brainArchitecture?: BrainArchitecture;
    creativeTerritory?: CreativeTerritory;
    constraintReport?: ConstraintReport;
    partnerCritique?: DesignCriticResult;
  };
}

export interface ClientVisualIntent {
  businessEssence: string;
  industryDomain: string;
  desiredMotifs: string[];
  forbiddenMotifs: string[];
  abstractionLevel: 'abstract' | 'stylized' | 'recognizable';
  personality: string[];
  visualTone: string[];
  explicitRequests: string[];
  confidence: number;
  source: string;
}

export interface DesignStrategy {
  markArchitecture: string;
  symbolLogic: string;
  typographyLogic: string;
  colorSystem: string;
  constructionSystem: string;
  suggestFragments: string[];
  avoidFragments: string[];
  industryDirection: string;
  reasoning: string;
  confidence: number;
}

export interface BrainArchitecture {
  clientIntent: ClientVisualIntent;
  designStrategy: DesignStrategy;
  agentContributions: Array<{
    role: string;
    summary: string;
    fragments: string[];
  }>;
  interviewQuestions: BriefInterviewQuestion[];
  visualReferences: Array<{
    id: string;
    title?: string | null;
    summary?: string | null;
    similarity?: number;
    imageUrl?: string;
  }>;
  projectMemorySummary?: string;
}

export interface BriefInterviewQuestion {
  id: string;
  prompt: string;
  why: string;
  field: string;
  options?: string[];
}

export interface BriefInterviewResponse {
  questions: BriefInterviewQuestion[];
  readinessScore: number;
  summary: string;
  clientIntent: ClientVisualIntent;
}

export interface BriefFieldCoverage {
  field: string;
  label: string;
  included: boolean;
  snippet?: string;
}

export type BriefContextPayload = {
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
  selectedShapes?: string[];
  colorPalette?: 'auto' | 'black_white' | 'monochrome' | 'two_color' | 'multi_color' | 'corporate_blue' | 'red_accent' | 'limited' | 'custom';
  colorSelections?: string[];
  allowShadows?: boolean;
  allowPhotoreal?: boolean;
  renderEffectMode?: 'flat' | 'shadow' | '3d' | 'shadow_3d';
  clientNotes?: string;
  knowledgeInsights?: string;
  bestPromptHint?: string;
  critiqueNote?: string;
};

export interface Recommendation {
  principleId: string;
  name: string;
  reason: string;
  confidence: number;
}

export interface GenerateResponse {
  prompts: ComposedPrompt[];
  recommendations: Recommendation[];
  bestPrompt: ComposedPrompt;
  meta?: { intent: string };
  brainPowered?: boolean;
  partnerMode?: boolean;
  creativeTerritories?: CreativeTerritory[];
  selectedTerritoryId?: string;
  constraintReport?: ConstraintReport;
  critique?: DesignCriticResult;
  catalogIntelligence?: CatalogIntelligenceResult;
  partnerAttempts?: number;
}

export interface RecommendResponse {
  industry: string;
  recommendations: Recommendation[];
  suggestedPrinciples: DesignRule[];
  dna: LogoDNA;
}

export interface LogoFeedback {
  score?: number;
  emoji?: string;
  workedTags?: string[];
  missedTags?: string[];
  submittedAt: string;
  tagsUpdatedAt?: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  provider: 'openai' | 'mock';
  model?: string;
  revisedPrompt?: string;
  width: number;
  height: number;
  createdAt: string;
  feedback?: LogoFeedback;
}

export interface ImageGenerationResponse {
  images: GeneratedImage[];
  provider: 'openai' | 'mock';
  enhancedPrompt: string;
}

export interface ImageProviderInfo {
  id: 'openai' | 'mock';
  name: string;
  available: boolean;
}

export interface DesignBrief {
  personality: string;
  era: string;
  complexity: string;
  primaryEmotion: string;
  narrative: string;
  markType: '' | 'wordmark' | 'lettermark' | 'combination';
  typographyStyle: '' | 'standard' | 'constructed' | 'modified_glyph' | 'rebus' | 'monogram_ligature';
  colorPalette: '' | 'auto' | 'black_white' | 'monochrome' | 'two_color' | 'multi_color' | 'corporate_blue' | 'red_accent' | 'limited' | 'custom';
  colorSelections: string[];
  allowShadows: boolean;
  allowPhotoreal: boolean;
  clientNotes: string;
  geometry: string;
  construction: string;
  composition: string;
  typography: string;
  constraints: string;
  preferredShapes: string;
  /** Exact client selections. One item is mandatory; multiple items mean at least one. */
  selectedShapes: string[];
  knowledgeInsights: string;
  bestPromptHint: string;
  critiqueNote: string;
  /** Principle IDs collected from Brand DNA / Pipeline / Knowledge Graph */
  principleIds: string[];
  /** Logo catalog reference IDs selected as inspiration */
  catalogReferenceIds: string[];
  /** Auto-pick catalog references when none are manually selected */
  autoCatalogReferences: boolean;
  /** Explicit rebus wordmark — letter integrates image via negative space */
  rebusWordmark: boolean;
  /** Set only after the client applies section 3. */
  styleApplied: boolean;
  sources: string[];
}

export interface SavedProject {
  id: string;
  name: string;
  industry: string;
  companyName: string;
  updatedAt: number;
  variationCount: PromptCountOption;
  inspirationMode: string;
  preferredEra: string;
  minimalismLevel: number;
  designBrief: DesignBrief;
  prompts: ComposedPrompt[];
  recommendations: Recommendation[];
  selectedPromptId: string | null;
  brainPartner: BrainPartnerState | null;
}

export const EMPTY_DESIGN_BRIEF: DesignBrief = {
  personality: '',
  era: '',
  complexity: '',
  primaryEmotion: '',
  narrative: '',
  markType: '',
  typographyStyle: '',
  colorPalette: '',
  colorSelections: [],
  allowShadows: false,
  allowPhotoreal: false,
  clientNotes: '',
  geometry: '',
  construction: '',
  composition: '',
  typography: '',
  constraints: '',
  preferredShapes: '',
  selectedShapes: [],
  knowledgeInsights: '',
  bestPromptHint: '',
  critiqueNote: '',
  principleIds: [],
  catalogReferenceIds: [],
  autoCatalogReferences: false,
  rebusWordmark: false,
  styleApplied: false,
  sources: [],
};

// --- Design Brain types ---

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
  nightlyResearchConfigured?: boolean;
  nightlyResearchActive?: boolean;
  tavilyConfigured?: boolean;
  braveConfigured?: boolean;
  ocrConfigured?: boolean;
  trustedDomains?: string[];
}

export interface PrincipleCitation {
  url: string;
  quote: string;
}

export interface LearnedPrincipleCategoryCount {
  category: string;
  count: number;
}

export type LearnedPrinciplesSort = 'influence_desc' | 'influence_asc' | 'category';

export interface LearnedPrinciplesPage {
  items: LearnedPrincipleRecord[];
  total: number;
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
