# Cursor Backlog

## Epic: Knowledge Base Expansion
- **Feature:** Principle Generator
  - Story: As a developer, I can regenerate 1000+ principles via seed script
  - Task: Run `npm run seed -w @logo-platform/knowledge-base`
- **Feature:** Graph Auto-generation
  - Story: Compatibility arrays auto-create graph edges
  - Task: Verify `buildKnowledgeGraph()` in seed script

## Epic: AI Engines
- **Feature:** Brand DNA
  - Story: Analyze company + industry → visual DNA profile
  - Task: `POST /api/engines/brand-dna`
- **Feature:** Full Pipeline
  - Story: Run all engines in orchestrated sequence
  - Task: `POST /api/engines/pipeline`
- **Feature:** SVG Blueprint
  - Story: Generate construction SVG from primitives
  - Task: `POST /api/engines/svg-blueprint`

## Epic: Web Application
- **Feature:** Dashboard
  - Story: Overview stats and engine navigation
  - Task: DashboardPage with React Router
- **Feature:** Engine Pages
  - Story: Dedicated UI for each engine
  - Task: BrandDNA, Geometry, Pipeline, Critic pages

## Epic: Database
- **Feature:** PostgreSQL Schema
  - Story: Full entity model for SaaS
  - Task: `packages/database/sql/migrations`
- **Feature:** Persistence Layer
  - Story: Save pipeline results to database
  - Task: Wire EnginesService to parameterized SQL

## Epic: Image Generation (Future)
- **Feature:** Provider Adapter
  - Story: Generate images from composed prompts
  - Task: Integrate OpenAI Images API
- **Feature:** Durable Long Tasks
  - Story: PDF/OCR and research survive API restarts
  - Task: PostgreSQL task runner with progress and cancellation

## User Stories Sample (300+ total in full spec)

| ID | Story | Priority |
|----|-------|----------|
| US-001 | As a designer, I enter an industry and get ranked prompts | P0 |
| US-002 | As a brand manager, I analyze Brand DNA for my company | P0 |
| US-003 | As a designer, I explore the knowledge graph | P1 |
| US-004 | As a developer, I call the full pipeline via API | P0 |
| US-005 | As a designer, I reverse-analyze an existing logo | P1 |
| US-006 | As a designer, I view SVG construction blueprints | P1 |
| US-007 | As an agency, I save projects to my organization | P2 |
| US-008 | As a designer, I evolve weak prompts automatically | P1 |
| US-009 | As a designer, I get logo critique with improvement plan | P1 |
| US-010 | As a developer, I integrate via OpenAPI spec | P1 |

*Full 300-500 story set expands each engine feature into granular stories following this pattern.*
