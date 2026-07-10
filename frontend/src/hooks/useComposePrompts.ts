import { useMutation } from '@tanstack/react-query';
import { generatePrompts } from '../api';
import { useAppStore } from '../store';
import {
  designBriefToBriefContext,
  parseEraFromBrief,
  parseLogoMarkType,
  parseMarkTypeFromBrief,
  parseTypographyStyle,
  parseTypographyStyleFromBrief,
} from '../lib/brief-mappers';

export function useComposePrompts() {
  const {
    industry,
    companyName,
    variationCount,
    inspirationMode,
    preferredEra,
    minimalismLevel,
    designBrief,
    setResults,
  } = useAppStore();

  const hasDesignBrief = designBrief.sources.length > 0;

  return useMutation({
    mutationFn: () => {
      const era = hasDesignBrief
        ? parseEraFromBrief(designBrief.era)
        : parseEraFromBrief(preferredEra) ?? parseEraFromBrief(designBrief.era);
      const principleIds = designBrief.principleIds ?? [];
      const analysisPrincipleIds = principleIds.length > 0 ? principleIds : undefined;
      const catalogIds = designBrief.catalogReferenceIds ?? [];
      const catalogReferenceIds = catalogIds.length > 0 ? catalogIds : undefined;
      const markType = parseMarkTypeFromBrief(designBrief);
      const typographyStyle = parseTypographyStyleFromBrief(designBrief);
      const brandName = companyName.trim() || undefined;
      const logoMarkType = parseLogoMarkType(
        markType ?? designBrief.markType,
        brandName,
      );
      const briefContext = (() => {
        const ctx = designBriefToBriefContext(designBrief);
        if (!ctx || brandName) return ctx;
        const { typography: _typography, ...symbolOnlyContext } = ctx;
        return Object.keys(symbolOnlyContext).length > 0 ? symbolOnlyContext : undefined;
      })();

      return generatePrompts({
        industry: industry.trim(),
        companyName: brandName,
        variationCount,
        inspirationMode: hasDesignBrief ? undefined : inspirationMode || undefined,
        minimalismLevel,
        preferredEra: era,
        analysisPrincipleIds,
        catalogReferenceIds,
        catalogNarrative: catalogReferenceIds ? designBrief.narrative || undefined : undefined,
        markType: logoMarkType,
        typographyStyle: brandName ? typographyStyle : parseTypographyStyle(designBrief.typographyStyle),
        briefContext,
      });
    },
    onSuccess: (data) => setResults(data.prompts, data.recommendations),
  });
}
