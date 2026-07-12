import type { PartnerRegenerateAction } from '../components/prompts/BrainPartnerPanel';

export const PROMPT_GENERATE_INTENTS = [
  'compose',
  'new-variations',
  're-pick',
  'apply-territory',
  'resolve-conflicts',
] as const;

export type PromptGenerateIntent = (typeof PROMPT_GENERATE_INTENTS)[number];

export function toPromptGenerateIntent(action?: PartnerRegenerateAction): PromptGenerateIntent {
  switch (action) {
    case 'new-variations':
      return 'new-variations';
    case 're-pick':
      return 're-pick';
    case 'apply':
      return 'apply-territory';
    case 'resolve-conflict':
      return 'resolve-conflicts';
    default:
      return 'compose';
  }
}
