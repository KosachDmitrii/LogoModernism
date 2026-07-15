import type { PrismaClient } from '@logo-platform/database';
import type {
  BrainExperienceRecord,
  BrainGenerateRequest,
  BriefInterviewResponse,
  BrainArchitecture,
} from '@logo-platform/shared';
import {
  buildDesignStrategy,
  buildClientAvoidFragments,
  isStyleAntiPatternMotif,
} from '@logo-platform/shared';
import { analyzeClientIntent } from './client-intent-analyzer';
import { solveConstraints } from './constraint-solver';
import { runDesignAgents } from './agent-orchestrator';
import { buildBriefInterview } from './brief-interview';
import { loadProjectMemory } from '../learning/project-memory';
import { selectVisualReferences } from '../retrieval/visual-memory';

export async function buildBrainArchitecture(
  prisma: PrismaClient,
  request: BrainGenerateRequest,
  retrievedExperiences: BrainExperienceRecord[],
): Promise<BrainArchitecture> {
  if (!request.organizationId) {
    throw new Error('Organization scope is required for Brain architecture');
  }
  let clientIntent = await analyzeClientIntent({
    industry: request.industry,
    companyName: request.companyName,
    briefContext: request.briefContext,
  });

  const projectMemory = await loadProjectMemory(prisma, request.companyName, {
    organizationId: request.organizationId,
    projectId: request.projectId,
  });
  if (projectMemory) {
    clientIntent = {
      ...clientIntent,
      desiredMotifs: [...new Set([...clientIntent.desiredMotifs, ...projectMemory.likedMotifs])],
      forbiddenMotifs: [
        ...new Set([
          ...clientIntent.forbiddenMotifs,
          ...projectMemory.dislikedMotifs.filter((motif) => !isStyleAntiPatternMotif(motif)),
        ]),
      ],
    };
  }

  const designStrategy = buildDesignStrategy(clientIntent, {
    markType: request.markType,
    colorPalette: request.briefContext?.colorPalette,
    minimalismLevel: request.minimalismLevel,
  });

  const agentContributions = runDesignAgents(clientIntent, designStrategy);
  const interview = buildBriefInterview(clientIntent, request.briefContext, {
    markType: request.markType,
  });
  const visualReferences = selectVisualReferences(retrievedExperiences);

  return {
    clientIntent,
    designStrategy,
    agentContributions,
    interviewQuestions: interview.questions,
    visualReferences,
    projectMemorySummary: projectMemory?.summary,
  };
}

export async function runBriefInterview(
  prisma: PrismaClient,
  input: {
    industry: string;
    companyName?: string;
    briefContext?: BrainGenerateRequest['briefContext'];
    markType?: string;
  },
): Promise<BriefInterviewResponse> {
  const clientIntent = await analyzeClientIntent(input);
  const interview = buildBriefInterview(clientIntent, input.briefContext, {
    markType: input.markType,
  });
  return {
    ...interview,
    clientIntent,
  };
}

export { solveConstraints, buildClientAvoidFragments };
