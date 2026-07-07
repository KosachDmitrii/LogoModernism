# Logo Modernism — AI BIOS Enterprise Platform

Professional logo design platform built on structured modernist design principles and 12 AI engines.

**Key design decision:** The platform does NOT use copyrighted book PDFs at runtime. Design principles are extracted once into a structured knowledge base (1000+ rules, knowledge graph) that powers all generation.

## Architecture

```
Knowledge Base (1050+ principles, graph, templates)
        ↓
12 AI Engines (Brand DNA, Geometry, Typography, …)
        ↓
Design Rules Engine → Prompt Composer → Optimizer → Scorer
        ↓
Evolution Engine → SVG Blueprint → Logo Critic
        ↓
[Future] AI Image Generator
```

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, Tailwind 4, React Router, Zustand, React Query |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL, Prisma |
| Core | shared, knowledge-base, prompt-engine, ai-engines, database |

## Quick Start

```bash
cd logo-platform
npm install
npm run seed -w @logo-platform/knowledge-base
npm run build
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3001/api
- Docs: `/docs`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/prompts/generate` | Generate ranked prompt variations |
| POST | `/api/engines/pipeline` | Run full AI pipeline |
| POST | `/api/engines/brand-dna` | Brand DNA analysis |
| POST | `/api/engines/geometry` | Geometry intelligence |
| POST | `/api/engines/reverse-analysis` | Reverse logo analysis |
| GET | `/api/engines/knowledge-graph` | Knowledge graph visualization |
| GET | `/api/engines/primitives` | Geometry primitive library |
| POST | `/api/images/generate-from-prompt` | Generate logo image from prompt |
| GET | `/api/images/providers` | List image providers (OpenAI / mock) |

Full OpenAPI spec: `docs/06-api/openapi.yaml`

## Project Structure

```
logo-platform/
├── apps/
│   ├── api/          # NestJS REST API
│   └── web/          # React frontend (7 pages)
├── packages/
│   ├── shared/       # TypeScript types
│   ├── knowledge-base/  # 1050+ principles, graph, templates
│   ├── prompt-engine/   # Rules engine, composer, scorer
│   ├── ai-engines/      # 12 AI engines + orchestrator
│   └── database/        # Prisma schema
└── docs/             # Enterprise documentation (10 sections)
```

## Documentation

See [docs/README.md](./docs/README.md) for full enterprise documentation including Vision, PRD, Architecture, AI Engines, Database, API, UI/UX, Roadmap, and Cursor Backlog.

## Roadmap

- [x] 1050+ structured design principles
- [x] 12 AI engines with orchestrator
- [x] Knowledge graph compatibility
- [x] Full React dashboard with routing
- [x] PostgreSQL + Prisma schema
- [x] OpenAPI specification
- [x] Image generation (OpenAI DALL·E 3 + mock fallback)
- [x] Enterprise /docs structure
- [ ] Database persistence wired to API
- [ ] Redis + BullMQ job queue
- [ ] Flux / Ideogram providers
- [ ] pgvector RAG search
