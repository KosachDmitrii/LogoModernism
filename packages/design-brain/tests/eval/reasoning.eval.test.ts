import { describe, it } from 'vitest';
import { reasonDesignDecision } from '../../src/reasoning/brain-reasoning';
import {
  GOLDEN_REASONING_CASES,
  buildBasePromptForCase,
} from './golden-briefs';
import { assertReasoningQuality } from './helpers/assertions';

const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());
const describeEval = hasOpenAi ? describe : describe.skip;

describeEval('LLM eval — brain reasoning', () => {
  for (const testCase of GOLDEN_REASONING_CASES) {
    it(
      `${testCase.id}: ${testCase.label}`,
      async () => {
        const basePromptText = buildBasePromptForCase(testCase.request);
        const tasteProfile = {
          preferredMarkTypes: ['wordmark', 'lettermark'],
          preferredGeometry: ['circle', 'grid-based'],
          preferredColors: ['black_white'],
          preferredRendering: ['flat vector'],
          avoidedPatterns: ['gradients', 'shadows', 'photorealism'],
          averageScore: 7,
          signalCount: 0,
          summary: 'Eval defaults — modernist taste.',
        };

        const decision = await reasonDesignDecision({
          industry: testCase.request.industry,
          companyName: testCase.request.companyName,
          briefContext: testCase.request.briefContext,
          retrievedExperiences: [],
          learnedPrinciples: [
            {
              category: 'geometry',
              ruleText: 'Build from modular grid construction.',
              promptFragment: 'modular grid construction',
              weight: 1.2,
            },
          ],
          tasteProfile,
          markType: testCase.request.markType,
          typographyStyle: testCase.request.typographyStyle,
          preferredEra: testCase.request.preferredEra,
          minimalismLevel: testCase.request.minimalismLevel,
          basePromptText,
          basePrinciples: [],
        });

        assertReasoningQuality(decision, basePromptText, testCase.expectations);
      },
      120_000,
    );
  }
});
