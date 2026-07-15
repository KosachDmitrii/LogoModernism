# Product Requirements Document

## Epic 1: Knowledge Base

### Features
- 1000+ structured design principles (JSON)
- Knowledge graph with compatibility edges
- 500+ prompt templates
- Logo reference library (modernist canon)
- Full-text search and category filtering

### Acceptance Criteria
- [x] Principles cover 17 categories
- [x] Graph auto-generated from compatibility arrays
- [x] Seed script regenerates all data
- [x] API endpoints for search, graph, templates

## Epic 2: Prompt Engine

### Features
- Design Rules Engine (industry → principle selection)
- Prompt Composer (layered assembly)
- Prompt Optimizer (dedup, contradictions)
- Prompt Scorer (8 quality dimensions)
- Prompt Evolution (mutation of weak prompts)

### Acceptance Criteria
- [x] Generate 1-100 prompt variations
- [x] Inspiration modes (Swiss, Bauhaus, IBM, NASA, etc.)
- [x] Ranked output by promptQuality score
- [x] Evolution triggers when score < 7.0

## Epic 3: AI Engines

### Features
- Brand DNA Engine
- Letter DNA Engine
- Geometry Intelligence + Primitive Library
- Shape Psychology Engine
- Typography Intelligence
- Construction Solver
- Composition AI
- SVG Blueprint Engine
- Reverse Logo Analysis
- Logo Critic
- Evolution Engine
- Knowledge Graph Engine
- Full Pipeline Orchestrator

### Acceptance Criteria
- [x] Each engine exposed via REST API
- [x] Full pipeline runs all engines in sequence
- [x] SVG blueprint with construction guides

## Epic 4: Platform

### Features
- React dashboard with engine navigation
- PostgreSQL + versioned SQL migrations
- Organization / Project / Brand / Logo models
- OpenAPI specification

### Acceptance Criteria
- [x] Multi-page web application
- [x] SQL schema with all entities
- [ ] Database persistence wired to API
- [ ] Authentication (future)

## Epic 5: Image Generation (Future)

### Features
- OpenAI DALL-E / Flux / Ideogram integration
- Direct abortable image generation through the API
- PostgreSQL-backed tasks for PDF/OCR and research
- pgvector RAG search
- Editable SVG output
