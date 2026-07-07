# Knowledge Base

## Overview

The knowledge base is the foundation of AI BIOS. It contains structured design principles extracted from modernist logo design theory — **not** copyrighted book text at runtime.

## Data Files

| File | Count | Description |
|------|-------|-------------|
| `principles.json` | 1050+ | Structured design rules |
| `knowledge-graph.json` | 174+ | Compatibility edges |
| `logo-references.json` | 3+ | Canonical logo analyses |
| `prompt-templates.json` | 504+ | Composable prompt templates |

## Principle Categories

geometry, construction, composition, grid, typography, stroke, color, symmetry, negative_space, era, industry, complexity, effects, rendering, mark_type, balance, inspiration

## Brand DNA Model

Brand DNA connects business context to visual traits:

```
Company + Industry + Personality
    → visualTraits (geometry, construction, typography, era)
    → psychologyProfile (trust, innovation, luxury, approachability)
    → principleIds (from knowledge base)
    → narrative + constraints
```

## Regeneration

```bash
npm run seed -w @logo-platform/knowledge-base
```

This runs `generate-principles.ts` which builds base principles + enterprise-scale expansion to 1050 rules.
