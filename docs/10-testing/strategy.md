# Testing Strategy

## Unit Tests (Future)

| Package | Focus |
|---------|-------|
| prompt-engine | Rules selection, scoring, evolution |
| ai-engines | Each engine input/output contracts |
| knowledge-base | Search, graph queries |

## API Tests

- Health check: `GET /api/health`
- Prompt generation: `POST /api/prompts/generate`
- Full pipeline: `POST /api/engines/pipeline`
- Brand DNA: `POST /api/engines/brand-dna`

## Manual Test Plan

1. Start `npm run dev`
2. Dashboard shows 1050+ principles
3. Generate prompts for "AI company"
4. Run Brand DNA for "Acme Labs" / "tech"
5. View geometry primitives and recommendations
6. Explore knowledge graph clusters
7. Run full pipeline end-to-end
8. Reverse-analyze a logo description

## Quality Gates

- `npm run build` passes all packages
- Prompt quality score ≥ 7 for standard industries
- Pipeline completes in < 2s locally
