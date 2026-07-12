import { describe, it } from 'vitest';
import { analyzeClientIntent } from '../../src/reasoning/client-intent-analyzer';
import { GOLDEN_INTENT_CASES } from './golden-briefs';
import { assertClientIntentQuality } from './helpers/assertions';

const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());
const describeEval = hasOpenAi ? describe : describe.skip;

describeEval('LLM eval — client intent', () => {
  for (const testCase of GOLDEN_INTENT_CASES) {
    it(
      `${testCase.id}: respects explicit client notes`,
      async () => {
        const intent = await analyzeClientIntent({
          industry: testCase.industry,
          companyName: testCase.companyName,
          briefContext: { clientNotes: testCase.clientNotes },
        });

        assertClientIntentQuality(intent, {
          forbiddenAny: testCase.forbiddenAny,
          desiredAny: testCase.desiredAny,
        });
      },
      60_000,
    );
  }
});
