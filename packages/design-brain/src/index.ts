export { designBrain, DesignBrainService } from './brain.service';
export { embedText, isEmbeddingConfigured, getEmbeddingModel } from './embedding/embedding.service';
export { semanticSearch, getRelatedExperiences } from './retrieval/semantic-search';
export { ingestPdf } from './ingest/ingest-pdf';
export {
  getPdfIngestProgress,
  clearPdfIngestProgress,
} from './ingest/pdf-ingest-jobs';
export { ingestImage } from './ingest/ingest-image';
export { ingestFeedback } from './ingest/ingest-feedback';
export { ingestWebResearch } from './ingest/ingest-web';
export { ensureBrainSchema, isPgvectorEnabled } from './storage/pgvector';
export { EMBEDDING_DIMENSIONS, getBrainDataDir, getBrainUploadsDir, getGeneratedImagesDir, getCatalogPipelineDir, getWritableDataRoot, isUsingExternalPersistentStorage } from './storage/paths';
export { ensureBrainStorageLayout } from './storage/ensure-storage';
export { computeTasteProfile } from './learning/taste-profile';
export { consolidateBrain, scheduleNightlyConsolidation } from './learning/consolidate';
export {
  runWebResearch,
  previewWebResearch,
  listCandidates,
  getCandidate,
  approveResearchCandidate,
  rejectResearchCandidate,
} from './research/research.service';
export { getTrustedDomains } from './research/web-search';
export { expandResearchQueries } from './research/query-expander';
export { runBrainPromptPipeline, type BrainPipelineResult } from './reasoning/brain-prompt-pipeline';
export { runBrainPartnerPipeline } from './reasoning/brain-partner-pipeline';
export { buildCreativeTerritories, selectCreativeTerritory } from './reasoning/creative-strategy';
export { evaluateConstraintCompliance, constraintFeedback } from './reasoning/constraint-gate';
export { resolveCatalogIntelligence } from './retrieval/catalog-intelligence';
export { normalizeStructuredFeedback, structuredFeedbackMetadata } from './learning/structured-feedback';
export { reasonDesignDecision } from './reasoning/brain-reasoning';
export { runBriefInterview, buildBrainArchitecture } from './reasoning/brain-architecture';
export {
  parsePrinciples,
  dedupePrinciples,
  rankFallback,
  extractPrinciplesFromText,
  summarizeText,
  type ExtractedPrinciple,
} from './ingest/principle-extractor';
export { parseDecisionJson } from './reasoning/brain-reasoning';
export { generateWithCritiqueLoop, storeGenerationExperience } from './generation/critique-loop';
