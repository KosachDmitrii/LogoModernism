import { describe, it } from 'vitest';
import { extractPrinciplesFromText } from '../../src/ingest/principle-extractor';
import { PRINCIPLE_EXTRACTION_SOURCE } from './golden-briefs';
import { assertPrincipleExtractionQuality } from './helpers/assertions';

const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());
const describeEval = hasOpenAi ? describe : describe.skip;

describeEval('LLM eval — principle extraction', () => {
  it(
    'extracts actionable diverse principles from Swiss design source text',
    async () => {
      const principles = await extractPrinciplesFromText(
        PRINCIPLE_EXTRACTION_SOURCE,
        'Swiss International Typographic Style — logo design reference',
      );

      assertPrincipleExtractionQuality(principles);
    },
    120_000,
  );
});
