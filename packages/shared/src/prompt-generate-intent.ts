/** Client-declared operation for POST /prompts/generate (observability + analytics). */
export const PROMPT_GENERATE_INTENTS = [
  'compose',
  'new-variations',
  're-pick',
  'apply-territory',
  'resolve-conflicts',
] as const;

export type PromptGenerateIntent = (typeof PROMPT_GENERATE_INTENTS)[number];

export function isPromptGenerateIntent(value: string): value is PromptGenerateIntent {
  return (PROMPT_GENERATE_INTENTS as readonly string[]).includes(value);
}

export function resolvePromptGenerateIntent(
  bodyIntent?: string,
  queryIntent?: string,
): PromptGenerateIntent {
  if (bodyIntent && isPromptGenerateIntent(bodyIntent)) return bodyIntent;
  if (queryIntent && isPromptGenerateIntent(queryIntent)) return queryIntent;
  return 'compose';
}
