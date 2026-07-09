export interface PromptScores {
  modernismScore: number;
  swissScore: number;
  minimalismScore: number;
  geometryScore: number;
  readabilityScore: number;
  scalabilityScore: number;
  brandRecognitionScore: number;
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

export interface ComposedPrompt {
  id: string;
  text: string;
  industry: string;
  companyName?: string;
  selectedPrinciples: DesignRule[];
  scores: PromptScores;
  dna: LogoDNA;
  logos?: GeneratedImage[];
  feedback?: 'LIKE' | 'DISLIKE';
  savedAt?: string;
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
  colorPalette?: 'auto' | 'black_white' | 'monochrome' | 'two_color' | 'multi_color' | 'corporate_blue' | 'red_accent' | 'limited' | 'custom';
  colorSelections?: string[];
  allowShadows?: boolean;
  allowPhotoreal?: boolean;
  clientNotes?: string;
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
}

export interface RecommendResponse {
  industry: string;
  recommendations: Recommendation[];
  suggestedPrinciples: DesignRule[];
  dna: LogoDNA;
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
  typographyStyle: '' | 'standard' | 'constructed';
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
  knowledgeInsights: string;
  bestPromptHint: string;
  critiqueNote: string;
  /** Principle IDs collected from Brand DNA / Pipeline / Knowledge Graph */
  principleIds: string[];
  /** Logo catalog reference IDs selected as inspiration */
  catalogReferenceIds: string[];
  sources: string[];
}

export interface SavedProject {
  id: string;
  name: string;
  industry: string;
  companyName: string;
  updatedAt: number;
  variationCount: number;
  inspirationMode: string;
  preferredEra: string;
  minimalismLevel: number;
  designBrief: DesignBrief;
  prompts: ComposedPrompt[];
  recommendations: Recommendation[];
  selectedPromptId: string | null;
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
  knowledgeInsights: '',
  bestPromptHint: '',
  critiqueNote: '',
  principleIds: [],
  catalogReferenceIds: [],
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
