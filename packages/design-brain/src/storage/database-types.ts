export type { DatabaseClient } from '@logo-platform/database';

export interface BrainExperienceRow {
  id: string;
  sourceType: string;
  title: string | null;
  content: string;
  summary: string | null;
  metadata: unknown;
  filePath: string | null;
  organizationId: string | null;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrainTasteSignalRow {
  id: string;
  experienceId: string | null;
  signalType: string;
  score: number;
  context: string | null;
  metadata: unknown;
  organizationId: string | null;
  projectId: string | null;
  createdAt: Date;
}

export interface LearnedPrincipleRow {
  id: string;
  category: string;
  ruleText: string;
  promptFragment: string;
  weight: number;
  confidence: number;
  sourceIds: string[];
  antiPatterns: string[];
  tags: string[];
  citations: unknown;
  organizationId: string | null;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResearchCandidateRow {
  id: string;
  organizationId: string;
  projectId: string | null;
  createdBy: string | null;
  reviewedBy: string | null;
  query: string;
  status: string;
  sourceUrl: string;
  sourceTitle: string;
  snippet: string;
  summary: string;
  extractedText: string;
  principles: unknown;
  sourceScore: number | null;
  ingestResult: unknown;
  createdAt: Date;
  reviewedAt: Date | null;
}
