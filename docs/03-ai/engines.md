# AI Engines Specification

## Engine Registry

All engines live in `@logo-platform/ai-engines` and are exposed via `/api/engines/*`.

### Brand DNA Engine
**Input:** companyName, industry, personality, values  
**Output:** BrandDNAProfile with visual traits, psychology, principle IDs, narrative

### Letter DNA Engine
**Input:** text, style  
**Output:** per-letter analysis, monogram options, ligature opportunities

### Geometry Intelligence
**Input:** industry, preferredShapes, complexity  
**Output:** ranked primitive recommendations with SVG previews

### Shape Psychology
**Input:** shapes[], industry, brandPersonality  
**Output:** emotion mapping, associations, industry fit score

### Typography Intelligence
**Input:** companyName, industry, markType  
**Output:** primary type recommendation, hierarchy rules, anti-patterns

### Construction Solver
**Input:** primitiveIds[], gridType, complexity  
**Output:** step-by-step construction with grid references

### Composition AI
**Input:** markType, industry, hasNegativeSpace  
**Output:** layout recommendation with principle alignment

### SVG Blueprint Engine
**Input:** primitiveIds, construction solution  
**Output:** SVG with construction guides layer + mark layer

### Reverse Logo Analysis
**Input:** description, observedShapes, observedColors  
**Output:** estimated DNA, matched references, modernism score

### Logo Critic
**Input:** ComposedPrompt or description  
**Output:** extended critique with grades, trademark risk, improvement plan

### Evolution Engine
**Input:** weak prompt, strategy, maxGenerations  
**Output:** generational improvements with mutation log

### Knowledge Graph Engine
**Input:** nodeId (optional)  
**Output:** full graph visualization or node query with paths

### Pipeline Orchestrator
**Input:** companyName, industry, variationCount  
**Output:** combined results from all engines

## API Endpoints

| Method | Path | Engine |
|--------|------|--------|
| POST | /engines/brand-dna | Brand DNA |
| POST | /engines/letter-dna | Letter DNA |
| POST | /engines/geometry | Geometry Intelligence |
| POST | /engines/typography | Typography Intelligence |
| POST | /engines/composition | Composition AI |
| POST | /engines/construction | Construction Solver |
| POST | /engines/svg-blueprint | SVG Blueprint |
| POST | /engines/reverse-analysis | Reverse Analysis |
| POST | /engines/critique | Logo Critic |
| POST | /engines/evolution | Evolution |
| POST | /engines/pipeline | Full Pipeline |
| GET | /engines/primitives | Geometry Library |
| GET | /engines/knowledge-graph | Knowledge Graph |
| GET | /engines/knowledge-graph/:nodeId | Graph Query |
