import type { BrainGenerateRequest } from '@logo-platform/shared';
import { buildBasePromptFromRules } from '../../src/reasoning/prompt-enrichment';
import type { ReasoningEvalExpectations } from './helpers/assertions';
import { SAMPLE_SWISS_TEXT } from '../helpers/fixtures';

export interface GoldenReasoningCase {
  id: string;
  label: string;
  request: BrainGenerateRequest;
  expectations: ReasoningEvalExpectations;
}

export interface GoldenIntentCase {
  id: string;
  industry: string;
  companyName?: string;
  clientNotes: string;
  forbiddenAny: string[];
  desiredAny: string[];
}

function baseRequest(overrides: Partial<BrainGenerateRequest>): BrainGenerateRequest {
  return {
    industry: 'fintech',
    companyName: 'NovaPay',
    variationCount: 1,
    markType: 'wordmark',
    minimalismLevel: 8,
    useBrain: true,
    ...overrides,
  };
}

export const GOLDEN_REASONING_CASES: GoldenReasoningCase[] = [
  {
    id: 'fintech-monochrome',
    label: 'Fintech wordmark — black & white, flat vector',
    request: baseRequest({
      briefContext: {
        personality: 'trustworthy, precise',
        geometry: 'grid-based circles and quarter arcs',
        colorPalette: 'black_white',
        allowShadows: false,
        allowPhotoreal: false,
        constraints: 'Flat vector only. No gradients.',
      },
    }),
    expectations: {
      companyName: 'NovaPay',
      minPromptLength: 150,
      minBaseRatio: 0.85,
      requiredInPrompt: ['flat', 'vector'],
      forbiddenRecommendations: ['photoreal', 'mascot'],
      allowedMarkTypes: ['wordmark', 'lettermark'],
      maxGeometryFamilies: 3,
    },
  },
  {
    id: 'healthcare-no-mascot',
    label: 'Healthcare — explicit no mascot / no cartoon',
    request: baseRequest({
      industry: 'healthcare',
      companyName: 'MedCore',
      markType: 'combination',
      briefContext: {
        personality: 'calm, professional',
        colorPalette: 'monochrome',
        clientNotes: 'No mascots, no cartoon characters, no playful illustrations. Geometric and calm.',
        allowShadows: false,
        allowPhotoreal: false,
      },
    }),
    expectations: {
      companyName: 'MedCore',
      minPromptLength: 140,
      forbiddenRecommendations: ['mascot', 'cartoon'],
      allowedMarkTypes: ['wordmark', 'lettermark', 'combination'],
    },
  },
  {
    id: 'symbol-only',
    label: 'Symbol-only — no brand name text',
    request: baseRequest({
      companyName: undefined,
      markType: 'combination',
      industry: 'technology',
      briefContext: {
        geometry: 'interlaced weave, radial construction',
        colorPalette: 'black_white',
        allowShadows: false,
        allowPhotoreal: false,
      },
    }),
    expectations: {
      minPromptLength: 100,
      allowedMarkTypes: ['combination'],
      requiredInPrompt: ['symbol|abstract'],
      maxGeometryFamilies: 3,
    },
  },
  {
    id: 'restaurant-swiss',
    label: 'Restaurant — Swiss modernism language',
    request: baseRequest({
      industry: 'restaurant',
      companyName: 'Forma',
      markType: 'wordmark',
      briefContext: {
        personality: 'warm, balanced',
        geometry: 'round focal geometry, quarter-circle arcs',
        colorPalette: 'black_white',
        allowShadows: false,
        allowPhotoreal: false,
      },
    }),
    expectations: {
      companyName: 'Forma',
      minPromptLength: 130,
      requiredInPrompt: ['geometry|modular|grid'],
      forbiddenRecommendations: ['photoreal'],
      allowedMarkTypes: ['wordmark', 'lettermark'],
    },
  },
  {
    id: 'lettermark-constructed',
    label: 'Lettermark — constructed typography',
    request: baseRequest({
      companyName: 'Axis',
      markType: 'lettermark',
      typographyStyle: 'constructed',
      briefContext: {
        typography: 'constructed geometric sans-serif',
        colorPalette: 'black_white',
        allowShadows: false,
        allowPhotoreal: false,
      },
    }),
    expectations: {
      companyName: 'Axis',
      minPromptLength: 120,
      requiredInPrompt: ['geometric'],
      allowedMarkTypes: ['lettermark', 'wordmark'],
    },
  },
];

export const GOLDEN_INTENT_CASES: GoldenIntentCase[] = [
  {
    id: 'explicit-prohibitions',
    industry: 'fintech',
    companyName: 'NovaPay',
    clientNotes:
      'No gradients, no shadows, no mascot characters. Prefer strict geometric grid construction and flat vector black-on-white.',
    forbiddenAny: ['gradient', 'shadow', 'mascot'],
    desiredAny: ['geometric', 'grid'],
  },
  {
    id: 'abstract-symbol',
    industry: 'technology',
    clientNotes: 'Abstract symbol only — no letters, no wordmark. Minimal Swiss style.',
    forbiddenAny: ['letter', 'wordmark'],
    desiredAny: ['abstract', 'minimal'],
  },
];

export const PRINCIPLE_EXTRACTION_SOURCE = SAMPLE_SWISS_TEXT;

export function buildBasePromptForCase(request: BrainGenerateRequest): string {
  return buildBasePromptFromRules(request).text;
}
