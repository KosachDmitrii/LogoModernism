import type { BrainFeedbackInput, BrainGenerateRequest } from '@logo-platform/shared';

export const SAMPLE_SWISS_TEXT =
  'Swiss International Typographic Style uses modular grids, Helvetica-like sans-serif typography, and strict black-and-white palettes.';

export const SAMPLE_MASCOT_TEXT =
  'Mascot logos use cartoon characters, playful gradients, photorealistic shading, and decorative ornament.';

export function sampleGenerateRequest(overrides: Partial<BrainGenerateRequest> = {}): BrainGenerateRequest {
  return {
    industry: 'fintech',
    companyName: 'NovaPay',
    variationCount: 2,
    markType: 'wordmark',
    minimalismLevel: 8,
    briefContext: {
      personality: 'trustworthy, precise',
      geometry: 'grid-based circles',
      colorPalette: 'black_white',
      allowShadows: false,
      allowPhotoreal: false,
    },
    useBrain: true,
    ...overrides,
  };
}

export function sampleFeedback(
  overrides: Partial<BrainFeedbackInput> = {},
): BrainFeedbackInput {
  return {
    signalType: 'LIKE',
    score: 8,
    context: 'Strong geometric wordmark with grid-based construction and flat vector rendering',
    metadata: {
      workedTags: ['geometry', 'typography'],
      missedTags: [],
    },
    ...overrides,
  };
}

export const VALID_DECISION_JSON = `{
  "markType": "wordmark",
  "typographyStyle": "constructed",
  "geometry": ["circle", "grid-based"],
  "construction": ["modular-grid"],
  "composition": ["symmetry"],
  "typography": ["geometric-sans"],
  "era": "swiss",
  "principles": [
    { "category": "geometry", "promptFragment": "built from circle construction", "weight": 1.0 }
  ],
  "antiPatterns": ["gradients", "shadows"],
  "catalogReferences": [],
  "reasoning": "Enriched with Swiss grid construction for fintech trust.",
  "promptText": "Minimal geometric wordmark for NovaPay. Flat vector Swiss modernism, black on white, modular grid construction, circle-based geometry, geometric sans-serif typography. No gradients, no shadows.",
  "confidence": 0.82
}`;

export const PRINCIPLE_JSON_FIXTURE = `[
  {
    "category": "geometry",
    "ruleText": "Build marks from a modular grid.",
    "promptFragment": "modular grid construction",
    "confidence": 0.9,
    "antiPatterns": ["freehand sketch"],
    "tags": ["grid", "swiss"]
  },
  {
    "category": "geometry",
    "ruleText": "Build logos using modular grids.",
    "promptFragment": "modular grid construction",
    "confidence": 0.85,
    "tags": ["grid"]
  },
  {
    "category": "quality",
    "ruleText": "Use flat vector rendering only.",
    "promptFragment": "flat vector rendering",
    "confidence": 0.88,
    "antiPatterns": ["photorealism"]
  }
]`;
