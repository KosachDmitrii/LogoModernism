import type {
  BrainArchitecture,
  ComposedPrompt,
  CreativeTerritory,
  DesignDecision,
} from '@logo-platform/shared';
import type { CompileResult } from '@logo-platform/brief-compiler';
import { ensureSentence, joinSentences, repairGluedProse } from './prose';

type VariantAxis = CompileResult['prompts'][number]['schema']['variantAxis'];

const AXIS_TO_TERRITORY: Record<VariantAxis, CreativeTerritory['id']> = {
  balanced: 'territory-primary',
  construction_led: 'territory-construction',
  typography_led: 'territory-typography',
};

export function territoryForAxis(
  territories: CreativeTerritory[],
  axis: VariantAxis,
  fallbackId?: string,
): CreativeTerritory | undefined {
  const preferredId = AXIS_TO_TERRITORY[axis] ?? fallbackId;
  return (
    territories.find((t) => t.id === preferredId) ??
    territories.find((t) => t.id === fallbackId) ??
    territories[0]
  );
}

/** Human-readable why for a direction — used in UI cards and brand pack. */
export function buildDirectionReasoning(input: {
  territory?: CreativeTerritory;
  architecture?: BrainArchitecture;
  compile: CompileResult;
  axis: VariantAxis;
  principles: Array<{ name: string }>;
}): string {
  const { territory, architecture, compile, axis, principles } = input;
  const strategy = architecture?.designStrategy;
  const parts: string[] = [];

  const thesis = territory?.thesis
    ? repairGluedProse(territory.thesis)
    : strategy?.reasoning
      ? repairGluedProse(strategy.reasoning)
      : '';
  if (thesis) parts.push(thesis);

  const thesisLower = thesis.toLowerCase();
  if (axis === 'construction_led') {
    const c = compile.resolved.construction;
    if (c && !thesisLower.includes(c.toLowerCase())) {
      parts.push(`Construction focus: ${c}`);
    }
  } else if (axis === 'typography_led') {
    const t = territory?.typographyFocus ?? String(compile.resolved.typographyStyle);
    if (t && !thesisLower.includes(t.toLowerCase().slice(0, 24))) {
      parts.push(`Typography focus: ${t}`);
    }
  } else if (!/lead with|mark architecture|combination mark/i.test(thesisLower)) {
    parts.push(
      `Mark architecture: ${territory?.markArchitecture ?? compile.resolved.markType}`,
    );
  }

  if (strategy?.symbolLogic) {
    const sl = repairGluedProse(strategy.symbolLogic);
    if (sl && !thesisLower.includes(sl.toLowerCase().slice(0, 28))) {
      parts.push(sl);
    }
  }

  const principleNames = principles
    .map((p) => p.name)
    .filter(Boolean)
    .slice(0, 3);
  if (principleNames.length > 0) {
    parts.push(`Grounded in: ${principleNames.join(', ')}`);
  }

  const text = joinSentences(...parts);
  return text.length > 40
    ? text
    : ensureSentence(
        `Modernist ${compile.resolved.markType} direction for ${compile.resolved.era} construction (${compile.resolved.construction})`,
      );
}

export function buildDecisionReasoning(
  selectedTerritory: CreativeTerritory | undefined,
  architecture: BrainArchitecture | undefined,
  bestPrompt: ComposedPrompt,
): string {
  return (
    joinSentences(
      selectedTerritory?.thesis
        ? repairGluedProse(selectedTerritory.thesis)
        : null,
      architecture?.designStrategy?.reasoning
        ? repairGluedProse(architecture.designStrategy.reasoning)
        : null,
      architecture?.designStrategy?.symbolLogic
        ? repairGluedProse(architecture.designStrategy.symbolLogic)
        : null,
      `Best ranked direction scores ${bestPrompt.scores.promptQuality.toFixed(1)}/10`,
    ) || 'Compiled deterministically from canonical brief.'
  );
}

export function slimArchitectureForPrompt(
  architecture: BrainArchitecture,
): BrainArchitecture {
  return {
    clientIntent: architecture.clientIntent,
    designStrategy: architecture.designStrategy,
    agentContributions: (architecture.agentContributions ?? []).slice(0, 4),
    interviewQuestions: [],
    visualReferences: (architecture.visualReferences ?? []).slice(0, 4),
    projectMemorySummary: architecture.projectMemorySummary,
  };
}

export function enrichDecision(
  base: DesignDecision,
  selectedTerritory: CreativeTerritory | undefined,
  architecture: BrainArchitecture | undefined,
  bestPrompt: ComposedPrompt,
): DesignDecision {
  return {
    ...base,
    reasoning: buildDecisionReasoning(selectedTerritory, architecture, bestPrompt),
    confidence: bestPrompt.scores.promptQuality / 10,
  };
}

export { ensureSentence, joinSentences, repairGluedProse } from './prose';
