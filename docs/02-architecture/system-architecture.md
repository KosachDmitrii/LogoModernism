# System Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     React Web App (Vite)                     │
│  Dashboard │ Prompts │ Brand DNA │ Geometry │ Pipeline │ …  │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST /api
┌──────────────────────────▼──────────────────────────────────┐
│                    NestJS API Server                         │
│  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Prompts  │ │ Principles │ │ Engines  │ │ Health       │ │
│  └────┬─────┘ └─────┬──────┘ └────┬─────┘ └──────────────┘ │
└───────┼─────────────┼─────────────┼─────────────────────────┘
        │             │             │
┌───────▼─────────────▼─────────────▼─────────────────────────┐
│                    Core Packages (TypeScript)                 │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────────────┐ │
│  │ prompt-     │ │ knowledge-   │ │ ai-engines            │ │
│  │ engine      │ │ base         │ │ (12 engines)          │ │
│  └──────┬──────┘ └──────┬───────┘ └───────────┬───────────┘ │
│         └───────────────┼─────────────────────┘             │
│                    ┌────▼────┐                               │
│                    │ shared  │                               │
│                    └─────────┘                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│          PostgreSQL (parameterized SQL) — Persistence        │
│  Users │ Organizations │ Projects │ Brands │ Logos          │
└─────────────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
logo-platform/
├── apps/
│   ├── api/          # NestJS REST API
│   └── web/          # React 19 frontend
├── packages/
│   ├── shared/       # TypeScript types
│   ├── knowledge-base/   # Principles, graph, templates
│   ├── prompt-engine/    # Rules, composer, scorer
│   ├── ai-engines/       # 12 AI engines
│   └── database/         # SQL client and migrations
└── docs/             # Enterprise documentation
```

## Data Flow: Full Pipeline

```
Brand Input (name, industry)
    │
    ├─► Brand DNA Engine ──► visual traits, psychology
    ├─► Letter DNA Engine ──► monogram options, balance
    ├─► Geometry Intelligence ──► primitive recommendations
    ├─► Shape Psychology ──► emotion mapping
    ├─► Typography Intelligence ──► type recommendations
    ├─► Composition AI ──► layout selection
    ├─► Construction Solver ──► grid steps
    ├─► SVG Blueprint Engine ──► construction SVG
    ├─► Prompt Pipeline ──► ranked prompts
    ├─► Logo Critic ──► quality assessment
    └─► Evolution Engine ──► improve if score < 8
```

## Deployment (Target)

| Service | Platform | Port |
|---------|----------|------|
| Web | Vercel / static | 5173 |
| API | Railway / Docker | 3001 |
| Database | Supabase / RDS | 5432 |
