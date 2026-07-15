import { fetchWithDeadline } from '@logo-platform/shared';

const MAX_BRAINSTORM = 25;
const MAX_SELECTED = 15;
const MIN_SELECTED = 10;

const BRAINSTORM_PROMPT = `You are a design knowledge extractor for a self-learning logo design brain.

Given source material about logo design, brainstorm ALL actionable design principles you can find.

Return ONLY a JSON array of up to 25 objects:
{
  "category": "geometry|construction|composition|typography|process|quality|mark_type",
  "ruleText": "Clear rule in one sentence",
  "promptFragment": "short phrase for image generation prompts",
  "confidence": 0.0-1.0,
  "citationQuote": "short verbatim excerpt from source supporting this rule (max 200 chars)",
  "antiPatterns": ["things to avoid"],
  "tags": ["keyword1", "keyword2"]
}

Maximize concrete, reusable logo design rules. Skip vague generic advice.`;

const RANK_PROMPT = `You are a design knowledge curator.

Given source material and candidate principles, select the 10-15 MOST significant principles:
- Actionable and specific to logo design
- Diverse categories (not redundant)
- High confidence and clear promptFragment
- Drop weak, generic, or duplicate rules

Return ONLY a JSON array of 10-15 objects (same schema as candidates). Prefer exact ruleText/promptFragment from candidates when possible.`;

export interface ExtractedPrinciple {
  category: string;
  ruleText: string;
  promptFragment: string;
  confidence: number;
  citationQuote?: string;
  antiPatterns?: string[];
  tags?: string[];
}

export function parsePrinciples(content: string): ExtractedPrinciple[] {
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]) as ExtractedPrinciple[];
    return parsed.filter(
      (item) =>
        item.category &&
        item.ruleText &&
        item.promptFragment &&
        typeof item.confidence === 'number',
    );
  } catch {
    return [];
  }
}

export function dedupePrinciples(principles: ExtractedPrinciple[]): ExtractedPrinciple[] {
  const seen = new Set<string>();
  const result: ExtractedPrinciple[] = [];

  for (const principle of principles) {
    const key = principle.promptFragment.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(principle);
  }

  return result;
}

export function rankFallback(candidates: ExtractedPrinciple[]): ExtractedPrinciple[] {
  return dedupePrinciples(candidates)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_SELECTED);
}

async function callOpenAi(
  system: string,
  user: string,
  maxTokens: number,
): Promise<ExtractedPrinciple[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  const model = process.env.OPENAI_TEXT_MODEL ?? 'gpt-4o-mini';
  const response = await fetchWithDeadline('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  }, { timeoutMs: 45_000 });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return parsePrinciples(data.choices?.[0]?.message?.content ?? '[]');
}

const EXTRACT_CHUNK_SIZE = 8_000;
const EXTRACT_CHUNK_OVERLAP = 400;
const SUMMARY_EXCERPT_MAX = 12_000;

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function chunkForExtraction(text: string): string[] {
  if (text.length <= EXTRACT_CHUNK_SIZE) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + EXTRACT_CHUNK_SIZE));
    if (start + EXTRACT_CHUNK_SIZE >= text.length) break;
    start += EXTRACT_CHUNK_SIZE - EXTRACT_CHUNK_OVERLAP;
  }
  return chunks;
}

function excerptForSummary(text: string): string {
  if (text.length <= SUMMARY_EXCERPT_MAX) return text;
  const half = Math.floor(SUMMARY_EXCERPT_MAX / 2);
  return `${text.slice(0, half)}\n\n[... middle omitted for summary ...]\n\n${text.slice(-half)}`;
}

async function extractFromChunk(
  chunk: string,
  context?: string,
): Promise<ExtractedPrinciple[]> {
  const userContent = `${context ? `Context: ${context}\n\n` : ''}Source material:\n${chunk}`;
  const brainstormed = await callOpenAi(BRAINSTORM_PROMPT, userContent, 3500);
  return dedupePrinciples(brainstormed).slice(0, MAX_BRAINSTORM);
}
async function rankPrinciples(
  text: string,
  context: string | undefined,
  candidates: ExtractedPrinciple[],
): Promise<ExtractedPrinciple[]> {
  if (candidates.length <= MAX_SELECTED) {
    return rankFallback(candidates);
  }

  const numbered = candidates
    .map(
      (p, i) =>
        `${i + 1}. [${p.category}] ${p.promptFragment} — ${p.ruleText} (conf=${p.confidence})`,
    )
    .join('\n');

  const ranked = await callOpenAi(
    RANK_PROMPT,
    `${context ? `Context: ${context}\n\n` : ''}Source excerpt:\n${text.slice(0, 8000)}\n\nCandidates (${candidates.length}):\n${numbered}`,
    3200,
  );

  const picked = dedupePrinciples(ranked);
  if (picked.length >= MIN_SELECTED) {
    return picked.slice(0, MAX_SELECTED);
  }

  return rankFallback(candidates);
}

export async function extractPrinciplesFromText(
  text: string,
  context?: string,
): Promise<ExtractedPrinciple[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  const trimmed = normalizeText(text);
  if (!trimmed) return [];

  const chunks = chunkForExtraction(trimmed);
  const candidates: ExtractedPrinciple[] = [];

  for (const chunk of chunks) {
    candidates.push(...(await extractFromChunk(chunk, context)));
  }

  const deduped = dedupePrinciples(candidates);
  if (!deduped.length) return [];

  if (deduped.length <= MIN_SELECTED) {
    return deduped;
  }

  return rankPrinciples(excerptForSummary(trimmed), context, deduped);
}

export async function summarizeText(text: string, title?: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return text.slice(0, 280);
  }

  const model = process.env.OPENAI_TEXT_MODEL ?? 'gpt-4o-mini';
  const trimmed = excerptForSummary(normalizeText(text));
  if (!trimmed) return '';

  const response = await fetchWithDeadline('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content:
            'Summarize logo design knowledge in 2-3 sentences. Focus on visual rules, process, and quality criteria.',
        },
        {
          role: 'user',
          content: `${title ? `Title: ${title}\n` : ''}${trimmed}`,
        },
      ],
    }),
  }, { timeoutMs: 45_000 });

  if (!response.ok) {
    return trimmed.slice(0, 280);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() ?? trimmed.slice(0, 280);
}
