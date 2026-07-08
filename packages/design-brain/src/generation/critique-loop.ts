import type { BrainCritiqueGenerateRequest, BrainCritiqueGenerateResult } from '@logo-platform/shared';
import type { PrismaClient } from '@logo-platform/database';
import { critiqueLogo } from '@logo-platform/ai-engines';
import { generateImages } from '@logo-platform/image-generator';
import { embedText } from '../embedding/embedding.service';
import { createExperience } from '../storage/experience.repository';
import { upsertExperienceEmbedding } from '../storage/pgvector';
import { ingestFeedback } from '../ingest/ingest-feedback';
import { runBrainPromptPipeline } from '../reasoning/brain-prompt-pipeline';

function enrichRequestWithCritique(
  request: BrainCritiqueGenerateRequest,
  feedback: string[],
): BrainCritiqueGenerateRequest {
  const existing = request.briefContext?.constraints ?? '';
  const critiqueConstraints = feedback.join('. ');

  return {
    ...request,
    briefContext: {
      ...request.briefContext,
      constraints: [existing, critiqueConstraints].filter(Boolean).join('. '),
    },
    minimalismLevel: Math.min(10, (request.minimalismLevel ?? 8) + 1),
  };
}

export async function storeGenerationExperience(
  prisma: PrismaClient,
  input: {
    companyName?: string;
    industry: string;
    promptText: string;
    critiqueScore: number;
    principleIds: string[];
    imageUrl?: string;
  },
): Promise<string> {
  const content = [
    `Generated logo for ${input.companyName ?? input.industry}`,
    `Industry: ${input.industry}`,
    `Prompt: ${input.promptText}`,
    `Critique score: ${input.critiqueScore}`,
    input.imageUrl ? `Image: ${input.imageUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const experience = await createExperience(prisma, {
    sourceType: 'TEXT',
    title: `Generation: ${input.companyName ?? input.industry}`,
    content,
    summary: `Successful generation (score ${input.critiqueScore})`,
    metadata: {
      principleIds: input.principleIds,
      critiqueScore: input.critiqueScore,
      imageUrl: input.imageUrl,
      kind: 'generation_success',
    },
  });

  const embedding = await embedText(content);
  await upsertExperienceEmbedding(prisma, experience.id, embedding);
  return experience.id;
}

export async function generateWithCritiqueLoop(
  prisma: PrismaClient,
  request: BrainCritiqueGenerateRequest,
): Promise<BrainCritiqueGenerateResult> {
  const maxRetries = Math.min(request.maxRetries ?? 3, 5);
  const qualityThreshold = request.qualityThreshold ?? 7;
  let currentRequest = { ...request };
  let lastPipeline = await runBrainPromptPipeline(prisma, currentRequest);
  let lastCritique = critiqueLogo({ prompt: lastPipeline.bestPrompt });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    lastPipeline = await runBrainPromptPipeline(prisma, currentRequest);
    lastCritique = critiqueLogo({ prompt: lastPipeline.bestPrompt });

    if (lastCritique.overallScore >= qualityThreshold) {
      const storedExperienceId = await storeGenerationExperience(prisma, {
        companyName: request.companyName,
        industry: request.industry,
        promptText: lastPipeline.bestPrompt.text,
        critiqueScore: lastCritique.overallScore,
        principleIds: lastPipeline.bestPrompt.selectedPrinciples.map((p) => p.id),
      });

      await ingestFeedback(prisma, {
        signalType: 'APPROVE',
        score: lastCritique.overallScore,
        context: `Successful generation: ${lastPipeline.bestPrompt.text.slice(0, 300)}`,
        experienceId: storedExperienceId,
        metadata: {
          principleIds: lastPipeline.bestPrompt.selectedPrinciples.map((p) => p.id),
          markType: lastPipeline.decision.markType,
        },
      });

      let image;
      if (request.generateImage) {
        image = await generateImages({
          prompt: lastPipeline.bestPrompt.text,
          companyName: request.companyName,
          provider: request.imageProvider,
          markType: lastPipeline.decision.markType,
          typographyStyle: lastPipeline.decision.typographyStyle,
          count: 1,
        });
      }

      return {
        decision: lastPipeline.decision,
        bestPrompt: lastPipeline.bestPrompt,
        prompts: lastPipeline.prompts,
        retrievedExperiences: lastPipeline.retrievedExperiences,
        tasteProfile: lastPipeline.tasteProfile,
        critique: lastCritique,
        attempts: attempt,
        storedExperienceId,
        image,
        brainPowered: true,
      };
    }

    if (attempt < maxRetries) {
      currentRequest = enrichRequestWithCritique(currentRequest, lastCritique.feedback);
    }
  }

  await ingestFeedback(prisma, {
    signalType: 'REJECT',
    score: lastCritique.overallScore,
    context: `Failed quality threshold after ${maxRetries} attempts: ${lastCritique.feedback.join('; ')}`,
    metadata: {
      principleIds: lastPipeline.bestPrompt.selectedPrinciples.map((p) => p.id),
      markType: lastPipeline.decision.markType,
    },
  });

  let image;
  if (request.generateImage) {
    image = await generateImages({
      prompt: lastPipeline.bestPrompt.text,
      companyName: request.companyName,
      provider: request.imageProvider,
      markType: lastPipeline.decision.markType,
      typographyStyle: lastPipeline.decision.typographyStyle,
      count: 1,
    });
  }

  return {
    decision: lastPipeline.decision,
    bestPrompt: lastPipeline.bestPrompt,
    prompts: lastPipeline.prompts,
    retrievedExperiences: lastPipeline.retrievedExperiences,
    tasteProfile: lastPipeline.tasteProfile,
    critique: lastCritique,
    attempts: maxRetries,
    image,
    brainPowered: true,
  };
}
