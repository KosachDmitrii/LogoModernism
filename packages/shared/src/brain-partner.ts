import type { DesignCriticResult } from './types';

export type CreativeTerritoryId =
  | 'territory-primary'
  | 'territory-construction'
  | 'territory-typography';

export const CREATIVE_TERRITORY_IDS: CreativeTerritoryId[] = [
  'territory-primary',
  'territory-construction',
  'territory-typography',
];

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

export interface ConstraintViolation {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  suggestion?: string;
}

export interface ConstraintReport {
  passed: boolean;
  score: number;
  violations: ConstraintViolation[];
}

export interface CatalogIntelligenceResult {
  referenceIds: string[];
  recommendations: Array<{ id: string; name: string; industryScore: number }>;
  narrative: string;
  autoSelected: boolean;
}

export type StructuredFeedbackTag =
  | 'geometry'
  | 'typography'
  | 'color'
  | 'scalability'
  | 'brief_fit'
  | 'originality'
  | 'construction'
  | 'industry_fit';

export interface StructuredFeedbackDimensions {
  workedTags?: StructuredFeedbackTag[];
  missedTags?: StructuredFeedbackTag[];
  scalability?: 'good' | 'poor' | 'unknown';
  briefFit?: 'good' | 'partial' | 'poor';
  originality?: 'good' | 'generic' | 'unknown';
}

export interface BrainPartnerExtensions {
  partnerMode: true;
  creativeTerritories: CreativeTerritory[];
  selectedTerritoryId: string;
  constraintReport: ConstraintReport;
  catalogIntelligence: CatalogIntelligenceResult;
  critique?: DesignCriticResult;
  partnerAttempts: number;
}
