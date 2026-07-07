# AI BIOS Logo Platform

Enterprise SaaS platform for AI-powered modernist logo design.

## Documentation Index

| Section | Description |
|---------|-------------|
| [01-product](./01-product/) | Vision, PRD, user stories |
| [02-architecture](./02-architecture/) | System architecture, diagrams |
| [03-ai](./03-ai/) | AI engines specification |
| [04-knowledge](./04-knowledge/) | Knowledge base, Brand DNA |
| [05-database](./05-database/) | PostgreSQL schema, Prisma |
| [06-api](./06-api/) | OpenAPI specification |
| [07-ui](./07-ui/) | UI/UX design system |
| [08-development](./08-development/) | Roadmap, Cursor backlog |
| [09-prompts](./09-prompts/) | Prompt templates library |
| [10-testing](./10-testing/) | Testing strategy |

## Quick Start

```bash
npm install
npm run seed -w @logo-platform/knowledge-base
npm run build
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3001/api

## AI Engines

| Engine | Package | Description |
|--------|---------|-------------|
| Brand DNA | `@logo-platform/ai-engines` | Brand personality → visual traits |
| Letter DNA | `@logo-platform/ai-engines` | Typography and monogram analysis |
| Geometry Intelligence | `@logo-platform/ai-engines` | Primitive library + recommendations |
| Shape Psychology | `@logo-platform/ai-engines` | Shape → emotion mapping |
| Typography Intelligence | `@logo-platform/ai-engines` | Type system recommendations |
| Construction Solver | `@logo-platform/ai-engines` | Grid-based construction steps |
| Composition AI | `@logo-platform/ai-engines` | Layout and lockup analysis |
| SVG Blueprint | `@logo-platform/ai-engines` | Construction SVG generation |
| Reverse Analysis | `@logo-platform/ai-engines` | Logo → DNA extraction |
| Logo Critic | `@logo-platform/ai-engines` | Design quality assessment |
| Evolution Engine | `@logo-platform/ai-engines` | Iterative prompt improvement |
| Knowledge Graph | `@logo-platform/ai-engines` | Principle compatibility network |
| Prompt Pipeline | `@logo-platform/prompt-engine` | End-to-end prompt generation |

## Stack

- **Frontend:** React 19, Vite, Tailwind 4, React Router, Zustand, React Query
- **Backend:** NestJS, TypeScript
- **Database:** PostgreSQL, Prisma
- **Packages:** shared, knowledge-base, prompt-engine, ai-engines, database
