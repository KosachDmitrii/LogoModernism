import type { BrainGenerateRequest, LogoMarkType, TypographyStyle } from '@logo-platform/shared';

export const SCHEMA_VERSION = 'brief-compiler-v1';

export type MinimalismLevel = 'ultra' | 'minimal' | 'moderate';
export type VariantAxis = 'balanced' | 'construction_led' | 'typography_led';
export type ConflictSeverity = 'block' | 'override' | 'merge';
export type AuthoritySource = 'client' | 'reference' | 'system' | 'brand_lock';

export interface ReferenceProfile {
  catalogId: string;
  structureCue: string;
  geometry: string[];
  construction: string;
  composition: string;
  markTypeHint: LogoMarkType | 'symbol';
  eraHint: string;
  designer?: string;
  year?: number;
  attributionLabel: string;
  confidence: number;
  likenessRisk: 'low' | 'high';
}

export interface CanonicalBrief {
  industry: string;
  companyName?: string;
  era: string;
  inspiration: string;
  minimalism: MinimalismLevel;
  markType: LogoMarkType;
  typographyStyle: TypographyStyle;
  typographyDetails: string;
  shapes: string[];
  shapeRequirement: 'required' | 'at_least_one' | 'automatic';
  construction: string;
  composition: string;
  colorPalette: string;
  colorSelections: string[];
  clientNotes: string;
  clientContext: string[];
  forbiddenMotifs: string[];
  allowShadows: boolean;
  allowPhotoreal: boolean;
  rebusWordmark: boolean;
  styleIsExplicit: boolean;
  references: ReferenceProfile[];
}

export interface ConflictOverride {
  field: string;
  from: string;
  to: string;
  severity: ConflictSeverity;
  winner: 'reference' | 'brand_lock' | 'client';
  summary: string;
}

export interface ConflictBlock {
  code: string;
  field: string;
  summary: string;
  suggestion?: string;
}

export interface ResolvedBrief extends CanonicalBrief {
  overrides: ConflictOverride[];
  blocks: ConflictBlock[];
}

export interface SectionProvenance {
  section: string;
  value: string;
  source: AuthoritySource;
}

export interface PromptSchemaSection {
  key: string;
  text: string;
  provenance: SectionProvenance;
}

export interface PromptSchema {
  version: string;
  variantAxis: VariantAxis;
  variantIndex: number;
  sections: PromptSchemaSection[];
}

export interface CompiledPrompt {
  positive: string;
  negative: string;
  schema: PromptSchema;
  briefHash: string;
}

export interface CompileValidation {
  passed: boolean;
  violations: string[];
  warnings: string[];
}

export interface CompileResult {
  resolved: ResolvedBrief;
  prompts: CompiledPrompt[];
  validation: CompileValidation;
  readiness: { score: number; missing: string[] };
}

export interface PromptExperience {
  id: string;
  briefHash: string;
  schemaVersion: string;
  positive: string;
  negative: string;
  variantAxis: VariantAxis;
  outcome?: 'approved' | 'rejected' | 'generated';
  workedTags: string[];
  missedTags: string[];
  violations: string[];
  timestamp: string;
}

export type CompileRequest = BrainGenerateRequest;
