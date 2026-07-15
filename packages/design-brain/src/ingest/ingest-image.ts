import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import type { BrainIngestResult } from '@logo-platform/shared';
import { fetchWithDeadline } from '@logo-platform/shared';
import type { DatabaseClient } from '../storage/database-types';
import { reverseAnalyzeLogo } from '@logo-platform/ai-engines';
import { embedText } from '../embedding/embedding.service';
import { createExperience, upsertLearnedPrinciple } from '../storage/experience.repository';
import { upsertExperienceEmbedding } from '../storage/pgvector';
import { getBrainUploadsDir } from '../storage/paths';
import { extractPrinciplesFromText } from './principle-extractor';

const VISION_PROMPT = `Analyze this logo image as a design historian.

Return ONLY JSON:
{
  "name": "brand or unknown",
  "markType": "symbol|wordmark|lettermark|combination|emblem",
  "geometry": ["circle", "triangle"],
  "construction": ["grid-based"],
  "composition": ["symmetry", "negative-space"],
  "typography": ["geometric-sans"],
  "era": "swiss|bauhaus|corporate_identity|1960s|1970s|unknown",
  "colorCount": 1,
  "visualComplexity": "minimal|medium|high",
  "analysis": "2-3 sentences describing the design approach and what makes it work",
  "keywords": ["tag1", "tag2"]
}`;

export interface IngestImageOptions {
  buffer: Buffer;
  originalName: string;
  title?: string;
  mimeType?: string;
  organizationId?: string;
  projectId?: string;
}

interface VisionAnalysis {
  name?: string;
  markType?: string;
  geometry?: string[];
  construction?: string[];
  composition?: string[];
  typography?: string[];
  era?: string;
  colorCount?: number;
  visualComplexity?: string;
  analysis?: string;
  keywords?: string[];
}

export async function ingestImage(
  client: DatabaseClient,
  options: IngestImageOptions,
): Promise<BrainIngestResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  mkdirSync(getBrainUploadsDir(), { recursive: true });
  const ext = extname(options.originalName) || '.png';
  const savedName = `${Date.now()}-${basename(options.originalName, ext).replace(/[^a-zA-Z0-9._-]/g, '_')}${ext}`;
  const savedPath = join(getBrainUploadsDir(), savedName);
  writeFileSync(savedPath, options.buffer);

  const mimeType = options.mimeType ?? guessMimeType(ext);
  const imageB64 = options.buffer.toString('base64');
  const model = process.env.OPENAI_VISION_MODEL ?? 'gpt-4o-mini';

  const response = await fetchWithDeadline('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: VISION_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this logo for the design brain knowledge base.' },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${imageB64}`, detail: 'high' },
            },
          ],
        },
      ],
    }),
  }, { timeoutMs: 45_000 });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Vision analysis failed (${response.status}): ${err.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? '{}';
  const analysis = parseVisionJson(content);

  const title = options.title ?? analysis.name ?? basename(options.originalName, ext);
  const contentText = [
    `Logo: ${title}`,
    analysis.markType ? `Mark type: ${analysis.markType}` : '',
    analysis.geometry?.length ? `Geometry: ${analysis.geometry.join(', ')}` : '',
    analysis.construction?.length ? `Construction: ${analysis.construction.join(', ')}` : '',
    analysis.composition?.length ? `Composition: ${analysis.composition.join(', ')}` : '',
    analysis.typography?.length ? `Typography: ${analysis.typography.join(', ')}` : '',
    analysis.era ? `Era: ${analysis.era}` : '',
    analysis.analysis ?? '',
    analysis.keywords?.length ? `Keywords: ${analysis.keywords.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const reverseAnalysis = reverseAnalyzeLogo({
    description: contentText,
    observedShapes: analysis.geometry,
    observedColors: analysis.colorCount,
    observedStyle: analysis.era,
  });

  const enrichedContent = [
    contentText,
    reverseAnalysis.constructionHypothesis.length
      ? `Construction hypothesis: ${reverseAnalysis.constructionHypothesis.join('; ')}`
      : '',
    reverseAnalysis.matchedReferences.length
      ? `Similar references: ${reverseAnalysis.matchedReferences.map((ref) => ref.name).join(', ')}`
      : '',
    `Modernism score: ${reverseAnalysis.modernismScore}`,
  ]
    .filter(Boolean)
    .join('\n');

  const experience = await createExperience(client, {
    sourceType: 'IMAGE',
    title,
    content: enrichedContent,
    summary: analysis.analysis,
    filePath: savedPath,
    metadata: {
      originalName: options.originalName,
      vision: analysis,
      reverseAnalysis,
      principleIds: reverseAnalysis.matchedPrinciples.map((p) => p.id),
    },
    organizationId: options.organizationId,
    projectId: options.projectId,
  });

  const embedding = await embedText(enrichedContent);
  await upsertExperienceEmbedding(client, experience.id, embedding);

  const principles = await extractPrinciplesFromText(enrichedContent, `Logo image: ${title}`);
  let principlesExtracted = 0;

  for (const principle of principles) {
    await upsertLearnedPrinciple(client, {
      category: principle.category,
      ruleText: principle.ruleText,
      promptFragment: principle.promptFragment,
      confidence: principle.confidence,
      sourceId: experience.id,
      antiPatterns: principle.antiPatterns,
      tags: principle.tags,
      organizationId: options.organizationId,
      projectId: options.projectId,
    });
    principlesExtracted += 1;
  }

  return {
    experienceId: experience.id,
    sourceType: 'IMAGE',
    title,
    chunksStored: 1,
    principlesExtracted,
    summary: analysis.analysis,
  };
}

function parseVisionJson(content: string): VisionAnalysis {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return { analysis: content.slice(0, 500) };

  try {
    return JSON.parse(match[0]) as VisionAnalysis;
  } catch {
    return { analysis: content.slice(0, 500) };
  }
}

function guessMimeType(ext: string): string {
  const normalized = ext.toLowerCase();
  if (normalized === '.jpg' || normalized === '.jpeg') return 'image/jpeg';
  if (normalized === '.webp') return 'image/webp';
  if (normalized === '.gif') return 'image/gif';
  return 'image/png';
}
