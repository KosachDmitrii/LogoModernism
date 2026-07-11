import { useMutation } from '@tanstack/react-query';
import { generatePrompts } from '../api';
import { useAppStore } from '../store';
import type { BrainPartnerState, CreativeTerritoryId } from '../types';
import {
  designBriefToBriefContext,
  parseEraFromBrief,
  parseLogoMarkType,
  parseMarkTypeFromBrief,
  parseTypographyStyle,
  parseTypographyStyleFromBrief,
} from '../lib/brief-mappers';

export interface ComposePromptsOptions {
  /** When set, brain applies this creative territory to reasoning and prompts */
  preferredTerritoryId?: CreativeTerritoryId;
}

function toBrainPartnerState(
  data: Awaited<ReturnType<typeof generatePrompts>>,
  options?: ComposePromptsOptions,
): BrainPartnerState | null {
  if (
    !data.partnerMode ||
    !data.creativeTerritories ||
    !data.selectedTerritoryId ||
    !data.constraintReport ||
    !data.catalogIntelligence ||
    data.partnerAttempts == null
  ) {
    return null;
  }

  return {
    partnerMode: true,
    creativeTerritories: data.creativeTerritories,
    selectedTerritoryId: data.selectedTerritoryId,
    constraintReport: data.constraintReport,
    critique: data.critique,
    catalogIntelligence: data.catalogIntelligence,
    partnerAttempts: data.partnerAttempts,
    territorySelectionMode: options?.preferredTerritoryId ? 'manual' : 'auto',
  };
}

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
    mutationFn: (options?: ComposePromptsOptions) => {
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
        preferredTerritoryId: options?.preferredTerritoryId,
      }).then((data) => ({ data, options }));
    },
    onSuccess: ({ data, options }) => {
      setResults(data.prompts, data.recommendations, toBrainPartnerState(data, options));
    },
  });
}
