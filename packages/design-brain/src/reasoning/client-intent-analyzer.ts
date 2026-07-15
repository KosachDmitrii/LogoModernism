import type { BriefContext } from '@logo-platform/shared';
import {
  analyzeClientVisualIntent,
  fetchWithDeadline,
  mergeClientVisualIntent,
  type ClientVisualIntent,
} from '@logo-platform/shared';

export interface AnalyzeClientIntentInput {
  industry: string;
  companyName?: string;
  briefContext?: BriefContext;
}

export async function analyzeClientIntent(
  input: AnalyzeClientIntentInput,
): Promise<ClientVisualIntent> {
  const base = analyzeClientVisualIntent(input);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || !input.briefContext?.clientNotes?.trim()) {
    return base;
  }

  const model = process.env.OPENAI_TEXT_MODEL ?? 'gpt-4o-mini';
  const notes = input.briefContext.clientNotes.trim();

  try {
    const response = await fetchWithDeadline('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 600,
        messages: [
          {
            role: 'system',
            content:
              'You extract visual design intent from client notes for logo design. Return ONLY JSON: {"businessEssence":"","desiredMotifs":[],"forbiddenMotifs":[],"abstractionLevel":"abstract|stylized|recognizable","personality":[],"visualTone":[]}. Put ONLY explicit client prohibitions in forbiddenMotifs. Put what the client wants reinforced in desiredMotifs. Do not invent industry clichés.',
          },
          {
            role: 'user',
            content: `Industry: ${input.industry}\nCompany: ${input.companyName ?? '(none)'}\nClient notes: ${notes}`,
          },
        ],
      }),
    }, { timeoutMs: 30_000 });

    if (!response.ok) return base;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? '';
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return base;

    const parsed = JSON.parse(match[0]) as Partial<ClientVisualIntent>;
    return mergeClientVisualIntent(base, {
      ...parsed,
      source: 'hybrid',
      confidence: Math.min(0.95, base.confidence + 0.1),
    });
  } catch {
    return base;
  }
}
