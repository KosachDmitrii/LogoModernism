-- Design Brain: pgvector extension + embedding table
-- Run via: npm run db:brain-setup -w @logo-platform/database

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS brain_experience_embeddings (
  experience_id TEXT PRIMARY KEY,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT brain_experience_embeddings_experience_fkey
    FOREIGN KEY (experience_id) REFERENCES "BrainExperience"(id) ON DELETE CASCADE
);

-- Safe additive migration for learned principle citations
ALTER TABLE "LearnedPrinciple"
ADD COLUMN IF NOT EXISTS citations JSONB NOT NULL DEFAULT '[]'::jsonb;
