import type { ComposedPrompt } from '@logo-platform/shared';
import { evolvePrompt as baseEvolve, suggestMutations } from '@logo-platform/prompt-engine';

export interface EvolutionInput {
  prompt: ComposedPrompt;
  maxGenerations?: number;
  targetScore?: number;
  strategy?: 'aggressive' | 'conservative' | 'exploratory';
}

export interface EvolutionGeneration {
  generation: number;
  prompts: ComposedPrompt[];
  bestScore: number;
  mutationsApplied: string[];
}

export interface EvolutionResult {
  generations: EvolutionGeneration[];
  finalBest: ComposedPrompt;
  totalImprovement: number;
  converged: boolean;
}

export function runEvolution(input: EvolutionInput): EvolutionResult {
  const maxGen = input.maxGenerations ?? 3;
  const target = input.targetScore ?? 8;
  const generations: EvolutionGeneration[] = [];
  let current = input.prompt;
  let initialScore = current.scores.promptQuality;

  for (let gen = 0; gen < maxGen; gen++) {
    const attempts = input.strategy === 'aggressive' ? 5 : input.strategy === 'exploratory' ? 4 : 2;
    const evolved = baseEvolve(current, attempts);
    const mutations = suggestMutations(current).map((m) => m.reason);
    const bestScore = evolved[0]?.scores.promptQuality ?? current.scores.promptQuality;

    generations.push({
      generation: gen + 1,
      prompts: evolved,
      bestScore,
      mutationsApplied: mutations,
    });

    if (evolved[0] && evolved[0].scores.promptQuality > current.scores.promptQuality) {
      current = evolved[0];
    }

    if (current.scores.promptQuality >= target) break;
  }

  const finalBest = generations.length
    ? generations[generations.length - 1].prompts[0] ?? current
    : current;

  return {
    generations,
    finalBest,
    totalImprovement: finalBest.scores.promptQuality - initialScore,
    converged: finalBest.scores.promptQuality >= target,
  };
}
