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
  selectedPrinciples: DesignRule[];
  scores: PromptScores;
  dna: LogoDNA;
  metadata: {
    era: string;
    variationIndex?: number;
    inspirationMode?: string;
  };
}

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
  geometry: string;
  construction: string;
  composition: string;
  typography: string;
  constraints: string;
  preferredShapes: string;
  knowledgeInsights: string;
  bestPromptHint: string;
  critiqueNote: string;
  sources: string[];
}

export const EMPTY_DESIGN_BRIEF: DesignBrief = {
  personality: '',
  era: '',
  complexity: '',
  primaryEmotion: '',
  narrative: '',
  geometry: '',
  construction: '',
  composition: '',
  typography: '',
  constraints: '',
  preferredShapes: '',
  knowledgeInsights: '',
  bestPromptHint: '',
  critiqueNote: '',
  sources: [],
};
