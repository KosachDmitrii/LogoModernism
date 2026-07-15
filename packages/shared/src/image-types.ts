export type ImageProvider = 'openai' | 'mock';

export type ImageSize = '1024x1024' | '1024x1792' | '1792x1024';

import type { LogoMarkType, TypographyStyle } from './types';
import type { StylePreferenceInput } from './art-direction';

export interface ImageGenerationRequest extends StylePreferenceInput {
  prompt: string;
  provider?: ImageProvider;
  size?: ImageSize;
  count?: number;
  companyName?: string;
  markType?: LogoMarkType;
  typographyStyle?: TypographyStyle;
  signal?: AbortSignal;
}

export interface LogoFeedback {
  score?: number;
  emoji?: string;
  workedTags?: string[];
  missedTags?: string[];
  submittedAt: string;
  tagsUpdatedAt?: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  provider: ImageProvider;
  model?: string;
  revisedPrompt?: string;
  width: number;
  height: number;
  createdAt: string;
  feedback?: LogoFeedback;
}

export const LOGO_RATING_EMOJIS = [
  { emoji: '😍', score: 10, label: 'Excellent' },
  { emoji: '🙂', score: 8, label: 'Good' },
  { emoji: '😐', score: 6, label: 'OK' },
  { emoji: '😕', score: 4, label: 'Weak' },
  { emoji: '😞', score: 2, label: 'Poor' },
] as const;

export const LOGO_WORKED_TAGS = ['Geometry', 'Typography', 'Color'] as const;
export const LOGO_MISSED_TAGS = ['Too literal', 'Too complex', 'Off-brand'] as const;

export interface ImageGenerationResult {
  images: GeneratedImage[];
  provider: ImageProvider;
  model?: string;
  enhancedPrompt: string;
}
