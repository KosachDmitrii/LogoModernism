CREATE TABLE public.brain_research_candidates (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  project_id TEXT,
  created_by TEXT,
  reviewed_by TEXT,
  query TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  source_url TEXT NOT NULL,
  source_title TEXT NOT NULL,
  snippet TEXT NOT NULL,
  summary TEXT NOT NULL,
  extracted_text TEXT NOT NULL,
  principles JSONB NOT NULL,
  source_score DOUBLE PRECISION,
  ingest_result JSONB,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP(3),
  CONSTRAINT brain_research_candidates_organization_id_fkey
    FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT brain_research_candidates_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT brain_research_candidates_status_check
    CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX brain_research_candidates_tenant_status_created_at_idx
  ON public.brain_research_candidates(organization_id, status, created_at DESC);
CREATE INDEX brain_research_candidates_tenant_project_idx
  ON public.brain_research_candidates(organization_id, project_id);

ALTER TABLE public.brain_research_candidates ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.brain_research_candidates
  FROM PUBLIC, anon, authenticated, service_role;
