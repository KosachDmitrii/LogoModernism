const MAX_BRAINSTORM = 45;
const MAX_SELECTED = 25;

const BRAINSTORM_PROMPT = `You are a research planner for a self-learning logo design brain.

Given a topic (may contain comma-separated subtopics), brainstorm the MAXIMUM number of diverse web search queries to discover actionable logo design knowledge.

Return ONLY a JSON array of 35-45 strings. Each query:
- 4–16 words, concrete and searchable in English
- If the topic lists multiple subjects (comma/semicolon separated), generate several queries PER subject
- Cover angles: geometry, typography, construction, grid, composition, color, era/style, process, negative space, scalability, brand guidelines, presentation
- Focused on logo design, branding, visual identity — not generic marketing or unrelated topics

Maximize coverage and diversity. Do not repeat similar angles.`;

const RANK_PROMPT = `You are a design research curator for a logo design knowledge brain.

Given a topic and a list of candidate web search queries, select up to 25 queries that are:
- Most likely to yield actionable, reusable logo design principles
- Diverse (not redundant)
- Specific and searchable (not vague)
- Directly relevant to logo design, typography, geometry, branding, visual identity

Drop generic marketing fluff, duplicates, and weak queries.

Return ONLY a JSON array of up to 25 strings. Prefer exact wording from the candidate list.`;

export interface QueryExpansionResult {
  selectedQueries: string[];
  discoveredQueries: string[];
}

function parseQueries(content: string): string[] {
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(parsed)) return [];
    return dedupeQueries(
      parsed
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    );
  } catch {
    return [];
  }
}

function dedupeQueries(queries: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const query of queries) {
    const key = query.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(query);
  }
  return result;
}

function splitTopicParts(topic: string): string[] {
  return topic
    .split(/[,;]+/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter((part) => part.length > 1);
}

const ANGLES = [
  'logo design principles',
  'typography wordmark guidelines',
  'geometric construction grid',
  'composition negative space',
  'scalability minimal logo rules',
  'brand identity visual system',
  'Swiss modernist logo era',
  'color theory branding logo',
  'design process presentation',
];

function fallbackBrainstorm(topic: string): string[] {
  const parts = splitTopicParts(topic);
  const subjects = parts.length > 1 ? parts : [topic.trim()];
  const queries: string[] = [];

  for (const subject of subjects) {
    for (const angle of ANGLES) {
      queries.push(`${subject} ${angle}`);
    }
    queries.push(`how to apply ${subject} in logo design`);
    queries.push(`${subject} best practices logo branding`);
    queries.push(`${subject} modernist logo examples`);
  }

  return dedupeQueries(queries).slice(0, MAX_BRAINSTORM);
}

function fallbackRank(topic: string, candidates: string[]): string[] {
  const parts = splitTopicParts(topic).map((p) => p.toLowerCase());
  const scored = candidates.map((query) => {
    const lower = query.toLowerCase();
    let score = Math.min(query.split(' ').length, 12);
    if (lower.includes('logo')) score += 3;
    if (lower.includes('design') || lower.includes('typography') || lower.includes('brand')) score += 2;
    for (const part of parts) {
      if (part && lower.includes(part)) score += 4;
    }
    if (lower.includes('principle') || lower.includes('guideline') || lower.includes('construction')) {
      score += 2;
    }
    return { query, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return dedupeQueries(scored.map((row) => row.query)).slice(0, MAX_SELECTED);
}

async function callOpenAiJson(
  system: string,
  user: string,
  maxTokens: number,
): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  const model = process.env.OPENAI_TEXT_MODEL ?? 'gpt-4o-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return parseQueries(data.choices?.[0]?.message?.content ?? '[]');
}

async function brainstormQueries(topic: string): Promise<string[]> {
  const parts = splitTopicParts(topic);
  const userContent =
    parts.length > 1
      ? `Topic with subtopics:\n${parts.map((p) => `- ${p}`).join('\n')}\n\nGenerate queries covering EVERY subtopic.`
      : `Topic: ${topic}`;

  const llm = await callOpenAiJson(BRAINSTORM_PROMPT, userContent, 2800);
  const merged = dedupeQueries([...llm, ...fallbackBrainstorm(topic)]);
  return merged.slice(0, MAX_BRAINSTORM);
}

async function rankQueries(topic: string, candidates: string[]): Promise<string[]> {
  if (candidates.length <= MAX_SELECTED) {
    return candidates;
  }

  const numbered = candidates.map((q, i) => `${i + 1}. ${q}`).join('\n');
  const llm = await callOpenAiJson(
    RANK_PROMPT,
    `Topic: ${topic}\n\nCandidate queries (${candidates.length}):\n${numbered}`,
    1800,
  );

  const valid = llm.filter((q) =>
    candidates.some((c) => c.toLowerCase() === q.toLowerCase()),
  );
  const picked = dedupeQueries(valid.length >= 10 ? valid : llm);

  if (picked.length >= 10) {
    return picked.slice(0, MAX_SELECTED);
  }

  return fallbackRank(topic, candidates);
}

export async function expandResearchQueries(topic: string): Promise<QueryExpansionResult> {
  const trimmed = topic.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return { selectedQueries: [], discoveredQueries: [] };
  }

  const discoveredQueries = await brainstormQueries(trimmed);
  const selectedQueries = await rankQueries(trimmed, discoveredQueries);

  return {
    discoveredQueries,
    selectedQueries:
      selectedQueries.length > 0
        ? selectedQueries.slice(0, MAX_SELECTED)
        : discoveredQueries.slice(0, MAX_SELECTED),
  };
}
