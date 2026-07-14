export type DesignRuleCategory =
  | 'geometry'
  | 'construction'
  | 'composition'
  | 'grid'
  | 'typography'
  | 'stroke'
  | 'color'
  | 'symmetry'
  | 'negative_space'
  | 'era'
  | 'industry'
  | 'complexity'
  | 'effects'
  | 'rendering'
  | 'mark_type'
  | 'balance'
  | 'inspiration'
  | 'symmetry';

export type Era =
  | 'swiss'
  | 'bauhaus'
  | 'international_style'
  | 'corporate_identity'
  | '1960s'
  | '1970s'
  | 'mid_century';

export type LogoMarkType = 'wordmark' | 'lettermark' | 'combination';

/** Typography construction approach for wordmark / lettermark briefs */
export type TypographyStyle =
  | 'standard'
  | 'constructed'
  | 'modified_glyph'
  | 'rebus'
  | 'monogram_ligature';

export interface DesignRule {
  id: string;
  name: string;
  category: DesignRuleCategory;
  description: string;
  examples: string[];
  promptFragment: string;
  weight: number;
  compatibility: string[];
  antiPatterns: string[];
  tags: string[];
  era?: Era[];
  industries?: string[];
}

export interface KnowledgeGraphEdge {
  from: string;
  to: string;
  relation: 'works_with' | 'requires' | 'conflicts_with' | 'enhances';
}

export type CatalogChapter = 'geometric' | 'effect' | 'typographic';
export type CatalogEntryKind = 'logo' | 'case_study' | 'designer_profile';
export type CatalogMarkType = 'symbol' | 'wordmark' | 'lettermark' | 'combination' | 'emblem';

export interface LogoReference {
  id: string;
  name: string;
  designer?: string;
  year?: number;
  country?: string;
  industry: string;
  construction: string[];
  shape: string[];
  geometry: string[];
  composition: string[];
  grid: string[];
  negativeSpace: string[];
  typography: string[];
  stroke: string[];
  weight: string[];
  symmetry: string[];
  colorCount: number;
  visualComplexity: 'minimal' | 'medium' | 'high';
  minimalismLevel: number;
  era: Era;
  keywords: string[];
  principleIds: string[];
  /** Book taxonomy — Müller Logo Modernism */
  catalogChapter?: CatalogChapter;
  catalogSection?: string;
  entryKind?: CatalogEntryKind;
  markType?: CatalogMarkType;
  /** Original analytical summary (not book text) */
  significance?: string;
  bookPageHint?: string;
  /** Public URL of cropped logo image (Supabase Storage) */
  logoImageUrl?: string;
}

export interface CatalogTaxonomySection {
  id: string;
  label: string;
  chapter: CatalogChapter;
  description: string;
}

export interface CatalogTaxonomyChapter {
  id: CatalogChapter;
  label: string;
  description: string;
  sections: CatalogTaxonomySection[];
}

export interface CatalogSearchFilters {
  query?: string;
  chapter?: CatalogChapter;
  section?: string;
  era?: Era;
  industry?: string;
  /** Sort results by relevance to this project industry */
  rankByIndustry?: string;
  designer?: string;
  entryKind?: CatalogEntryKind;
  markType?: CatalogMarkType;
  limit?: number;
}

export type CatalogCandidateStatus = 'pending' | 'approved' | 'rejected';

export interface CatalogCropBox {
  /** Normalized 0–1000 coordinates relative to page image */
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

/** Raw + normalized entry from PDF/Vision import pipeline */
export interface CatalogCandidate {
  id: string;
  status: CatalogCandidateStatus;
  sourcePage: number;
  sourceIndex: number;
  pageImagePath?: string;
  /** Cropped logo PNG relative to PIPELINE_DIR, e.g. logos/cand-p29-0-name.png */
  logoImagePath?: string;
  /** Public Supabase Storage URL for cropped logo */
  logoImageUrl?: string;
  cropBox?: CatalogCropBox;
  name: string;
  industry: string;
  designer?: string;
  year?: number;
  country?: string;
  catalogChapter?: CatalogChapter;
  catalogSection?: string;
  era?: Era;
  markType?: CatalogMarkType;
  entryKind?: CatalogEntryKind;
  geometry: string[];
  construction: string[];
  composition: string[];
  typography: string[];
  keywords: string[];
  principleIds: string[];
  significance?: string;
  minimalismLevel: number;
  visualComplexity: 'minimal' | 'medium' | 'high';
  colorCount: number;
  confidence: number;
  rawVision?: Record<string, unknown>;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface CatalogPipelineStats {
  totalPages: number;
  extractedPages: number;
  totalCandidates: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface LogoDNA {
  geometry: string[];
  construction: string[];
  balance: string[];
  complexity: 'minimal' | 'medium' | 'high';
  era: Era;
  typography: string[];
  recognition: number;
  minimalism: number;
  visualWeight: string[];
  harmony: string[];
}

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

export interface ComposedPrompt {
  id: string;
  text: string;
  industry: string;
  selectedPrinciples: DesignRule[];
  scores: PromptScores;
  dna: LogoDNA;
  logos?: import('./image-types').GeneratedImage[];
  saved?: boolean;
  /** @deprecated use saved + logo feedback */
  feedback?: 'LIKE' | 'DISLIKE';
  metadata: {
    era: Era;
    variationIndex?: number;
    inspirationMode?: string;
    markType?: LogoMarkType;
    typographyStyle?: TypographyStyle;
    brainPowered?: boolean;
    reasoning?: string;
    confidence?: number;
    basePromptLength?: number;
    enrichedPromptLength?: number;
    stylePreferences?: import('./brain-types').BriefContext;
    brainArchitecture?: import('./brain-architecture').BrainArchitecture;
    creativeTerritory?: import('./brain-partner').CreativeTerritory;
    constraintReport?: import('./brain-partner').ConstraintReport;
    partnerCritique?: DesignCriticResult;
    negativePrompt?: string;
  };
}

export interface PromptGenerationRequest {
  industry: string;
  companyName?: string;
  variationCount?: number;
  inspirationMode?: InspirationMode;
  preferredEra?: Era;
  minimalismLevel?: number;
  /** Wordmark / lettermark / combination — from Brand DNA Design Brief */
  markType?: LogoMarkType;
  /** Constructed typography — letters as geometric primitives on a modular grid */
  typographyStyle?: TypographyStyle;
  /** Principle IDs from Brand DNA, Geometry, Pipeline, Knowledge Graph analysis */
  analysisPrincipleIds?: string[];
  /** Logo catalog reference IDs from Müller Logo Modernism */
  catalogReferenceIds?: string[];
  /** When true and no manual refs, auto-pick catalog references from recommendations */
  autoCatalogReferences?: boolean;
  /** Explicit rebus wordmark — letter integrates image via negative space */
  rebusWordmark?: boolean;
  /** Optional narrative from Design Brief (e.g. catalog significance) */
  catalogNarrative?: string;
  /** Design brief context from client */
  briefContext?: import('./brain-types').BriefContext;
  /** When false, skip Brain and use rule-based pipeline only */
  useBrain?: boolean;
  preferredTerritoryId?: import('./brain-partner').CreativeTerritoryId;
  /** Declares why the client invoked generate (logging / analytics; does not change pipeline). */
  intent?: import('./prompt-generate-intent').PromptGenerateIntent;
}

export type InspirationMode =
  | 'swiss'
  | 'bauhaus'
  | 'ibm'
  | 'nasa'
  | 'lufthansa'
  | 'braun'
  | 'cbs'
  | 'abc'
  | 'olivetti'
  | 'westinghouse';

export interface Recommendation {
  principleId: string;
  name: string;
  reason: string;
  confidence: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  industry?: string;
  era?: Era;
  tags: string[];
  principleIds: string[];
  templateFragments: string[];
}

export interface SearchFilters {
  query?: string;
  grid?: string[];
  negativeSpace?: boolean;
  shape?: string[];
  era?: Era[];
  markType?: string[];
  industry?: string[];
  minimalism?: number;
  tags?: string[];
}

export interface EvolutionMutation {
  field: keyof LogoDNA | 'shape' | 'grid' | 'stroke' | 'hierarchy';
  from: string[];
  to: string[];
  reason: string;
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
  suggestedMutations: EvolutionMutation[];
}
