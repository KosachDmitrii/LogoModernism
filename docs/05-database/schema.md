# Database Design

## Entity Relationship

```
User ──┬── OrganizationMember ── Organization
       │                           │
       └── Project ────────────────┘
              │
              ├── Brand ── BrandDNA
              │     └── Logo ── LogoVersion
              ├── PromptRun
              └── Logo
```

## Models

| Model | Purpose |
|-------|---------|
| User | Platform user account |
| Organization | Multi-tenant workspace |
| OrganizationMember | User ↔ Org with role |
| Project | Design project container |
| Brand | Brand identity entity |
| BrandDNA | Serialized DNA profile (JSON) |
| Logo | Logo artifact with SVG |
| LogoVersion | Version history |
| PromptRun | Pipeline execution log |
| DesignPrinciple | Synced KB principles |

## Setup

```bash
cp .env.example .env
# Set DATABASE_URL

npm run db:generate -w @logo-platform/database
npm run db:push -w @logo-platform/database
```

## Schema Location

`packages/database/sql/migrations`
