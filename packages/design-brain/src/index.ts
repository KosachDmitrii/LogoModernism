export { designBrain, DesignBrainService } from './brain.service';
export { embedText, isEmbeddingConfigured, getEmbeddingModel } from './embedding/embedding.service';
export { semanticSearch, getRelatedExperiences } from './retrieval/semantic-search';
export { ingestPdf } from './ingest/ingest-pdf';
export { ingestImage } from './ingest/ingest-image';
export { ingestFeedback } from './ingest/ingest-feedback';
export { ingestWebResearch } from './ingest/ingest-web';
export { ensureBrainSchema, isPgvectorEnabled } from './storage/pgvector';
export { EMBEDDING_DIMENSIONS, getBrainDataDir, getBrainUploadsDir } from './storage/paths';
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
export { reasonDesignDecision } from './reasoning/brain-reasoning';
export { generateWithCritiqueLoop, storeGenerationExperience } from './generation/critique-loop';
