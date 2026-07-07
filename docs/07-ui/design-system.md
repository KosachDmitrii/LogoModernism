# UI/UX Design System

## Layout

- **Sidebar navigation** — 7 engine pages + dashboard
- **Dark theme** — zinc palette, minimal chrome
- **Typography** — DM Sans (UI), IBM Plex Mono (code)

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Dashboard with stats and engine cards |
| `/prompts` | Prompt generation (original flow) |
| `/brand-dna` | Brand DNA analysis form |
| `/geometry` | Primitive library + recommendations |
| `/knowledge-graph` | Graph clusters and edges |
| `/pipeline` | Full orchestrated pipeline |
| `/critic` | Reverse logo analysis |

## Components

- `InputPanel` — prompt generation controls
- `PromptCard` — ranked prompt display with scores
- `ScoreBar` — quality dimension visualization
- `AppLayout` — sidebar + outlet

## Design Tokens

```css
--color-surface: #0a0a0b
--color-surface-elevated: #141416
--color-border: #27272a
--color-accent: #e4e4e7
--color-muted: #71717a
```

## Responsive

- Sidebar fixed on desktop
- Grid layouts collapse on mobile
- Sticky input panel on prompt page
