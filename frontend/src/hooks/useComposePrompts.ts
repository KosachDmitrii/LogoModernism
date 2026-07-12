import { useMutation } from '@tanstack/react-query';
import { generatePrompts } from '../api';
import { useAppStore } from '../store';
import type { BrainPartnerState, CreativeTerritoryId, DesignBrief } from '../types';
import {
  designBriefToBriefContext,
  parseEraFromBrief,
  parseLogoMarkType,
  parseMarkTypeFromBrief,
  parseTypographyStyle,
  parseTypographyStyleFromBrief,
} from '../lib/brief-mappers';
import type { PromptGenerateIntent } from '../lib/prompt-generate-intent';

export interface ComposePromptsOptions {
  /** When set, brain applies this creative territory to reasoning and prompts */
  preferredTerritoryId?: CreativeTerritoryId;
  /** Use this brief snapshot instead of the current store value (e.g. after conflict resolution) */
  briefOverride?: DesignBrief;
  /** Declares why generate was invoked (observability; echoed in API meta) */
  intent?: PromptGenerateIntent;
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

  return useMutation({
    mutationFn: (options?: ComposePromptsOptions) => {
      const activeBrief = options?.briefOverride ?? designBrief;
      const hasActiveBrief = activeBrief.sources.length > 0;
      const era = hasActiveBrief
        ? parseEraFromBrief(activeBrief.era)
        : parseEraFromBrief(preferredEra) ?? parseEraFromBrief(activeBrief.era);
      const principleIds = activeBrief.principleIds ?? [];
      const analysisPrincipleIds = principleIds.length > 0 ? principleIds : undefined;
      const catalogIds = activeBrief.catalogReferenceIds ?? [];
      const catalogReferenceIds = catalogIds.length > 0 ? catalogIds : undefined;
      const markType = parseMarkTypeFromBrief(activeBrief);
      const typographyStyle = parseTypographyStyleFromBrief(activeBrief);
      const brandName = companyName.trim() || undefined;
      const logoMarkType = parseLogoMarkType(
        markType ?? activeBrief.markType,
        brandName,
      );
      const briefContext = (() => {
        const ctx = designBriefToBriefContext(activeBrief);
        if (!ctx || brandName) return ctx;
        const { typography: _typography, ...symbolOnlyContext } = ctx;
        return Object.keys(symbolOnlyContext).length > 0 ? symbolOnlyContext : undefined;
      })();

      return generatePrompts({
        industry: industry.trim(),
        companyName: brandName,
        variationCount,
        inspirationMode: hasActiveBrief ? undefined : inspirationMode || undefined,
        minimalismLevel,
        preferredEra: era,
        analysisPrincipleIds,
        catalogReferenceIds,
        catalogNarrative: catalogReferenceIds ? activeBrief.narrative || undefined : undefined,
        markType: logoMarkType,
        typographyStyle: brandName ? typographyStyle : parseTypographyStyle(activeBrief.typographyStyle),
        briefContext,
        preferredTerritoryId: options?.preferredTerritoryId,
        intent: options?.intent,
      }).then((data) => ({ data, options }));
    },
    onSuccess: ({ data, options }) => {
      if (options?.briefOverride) {
        setResults(data.prompts, data.recommendations, toBrainPartnerState(data, options));
        useAppStore.setState({ designBrief: options.briefOverride });
        return;
      }
      setResults(data.prompts, data.recommendations, toBrainPartnerState(data, options));
    },
  });
}
