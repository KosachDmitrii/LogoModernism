import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ComposedPrompt, DesignBrief, GeneratedImage, Recommendation } from './types';
import { EMPTY_DESIGN_BRIEF } from './types';
import {
  applyBrandDNAToBrief,
  applyGeometryToBrief,
  applyKnowledgeGraphToBrief,
  applyPipelineToBrief,
} from './lib/apply-brief';

function clearPromptResults() {
  return {
    prompts: [] as ComposedPrompt[],
    recommendations: [] as Recommendation[],
    selectedPromptId: null as string | null,
    generatedImages: {} as Record<string, GeneratedImage[]>,
    generatingPromptId: null as string | null,
  };
}

function catalogRefsEqual(a: string[] | undefined, b: string[] | undefined): boolean {
  const left = [...(a ?? [])].sort();
  const right = [...(b ?? [])].sort();
  if (left.length !== right.length) return false;
  return left.every((id, index) => id === right[index]);
}

interface AppState {
  industry: string;
  companyName: string;
  variationCount: number;
  inspirationMode: string;
  preferredEra: string;
  minimalismLevel: number;
  designBrief: DesignBrief;
  prompts: ComposedPrompt[];
  recommendations: Recommendation[];
  selectedPromptId: string | null;
  generatedImages: Record<string, GeneratedImage[]>;
  generatingPromptId: string | null;
  setIndustry: (v: string) => void;
  setCompanyName: (v: string) => void;
  setVariationCount: (v: number) => void;
  setInspirationMode: (v: string) => void;
  setPreferredEra: (v: string) => void;
  setMinimalismLevel: (v: number) => void;
  updateDesignBrief: (patch: Partial<DesignBrief>) => void;
  clearDesignBrief: () => void;
  applyBrandDNA: (companyName: string, industry: string, result: Parameters<typeof applyBrandDNAToBrief>[1]) => void;
  applyGeometry: (industry: string, result: Parameters<typeof applyGeometryToBrief>[1]) => void;
  applyKnowledgeGraph: (result: Parameters<typeof applyKnowledgeGraphToBrief>[1]) => void;
  applyPipeline: (companyName: string, industry: string, result: Parameters<typeof applyPipelineToBrief>[1]) => void;
  setResults: (prompts: ComposedPrompt[], recommendations: Recommendation[]) => void;
  selectPrompt: (id: string) => void;
  setGenerating: (promptId: string | null) => void;
  setGeneratedImages: (promptId: string, images: GeneratedImage[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      industry: '',
      companyName: '',
      variationCount: 5,
      inspirationMode: '',
      preferredEra: '',
      minimalismLevel: 8,
      designBrief: { ...EMPTY_DESIGN_BRIEF },
      prompts: [],
      recommendations: [],
      selectedPromptId: null,
      generatedImages: {},
      generatingPromptId: null,
      setIndustry: (industry) =>
        set((state) =>
          state.industry === industry ? { industry } : { industry, ...clearPromptResults() },
        ),
      setCompanyName: (companyName) =>
        set((state) =>
          state.companyName === companyName
            ? { companyName }
            : { companyName, ...clearPromptResults() },
        ),
      setVariationCount: (variationCount) => set({ variationCount }),
      setInspirationMode: (inspirationMode) => set({ inspirationMode }),
      setPreferredEra: (preferredEra) =>
        set((state) =>
          state.preferredEra === preferredEra
            ? { preferredEra }
            : { preferredEra, ...clearPromptResults() },
        ),
      setMinimalismLevel: (minimalismLevel) => set({ minimalismLevel }),
      updateDesignBrief: (patch) =>
        set((state) => {
          const designBrief = { ...state.designBrief, ...patch };
          const catalogChanged =
            patch.catalogReferenceIds !== undefined &&
            !catalogRefsEqual(patch.catalogReferenceIds, state.designBrief.catalogReferenceIds);
          const eraChanged = patch.era !== undefined && patch.era !== state.designBrief.era;
          return catalogChanged || eraChanged
            ? { designBrief, ...clearPromptResults() }
            : { designBrief };
        }),
      clearDesignBrief: () =>
        set({ designBrief: { ...EMPTY_DESIGN_BRIEF }, ...clearPromptResults() }),
      applyBrandDNA: (companyName, industry, result) => {
        const { brief, inspirationMode, minimalismLevel } = applyBrandDNAToBrief(
          get().designBrief,
          result,
        );
        set({
          companyName,
          industry,
          designBrief: brief,
          ...(inspirationMode ? { inspirationMode } : {}),
          ...(result.visualTraits?.era ? { preferredEra: result.visualTraits.era } : {}),
          minimalismLevel,
          ...clearPromptResults(),
        });
      },
      applyGeometry: (industry, result) => {
        set({
          industry: industry || get().industry,
          designBrief: applyGeometryToBrief(get().designBrief, result),
          ...clearPromptResults(),
        });
      },
      applyKnowledgeGraph: (result) => {
        set({
          designBrief: applyKnowledgeGraphToBrief(get().designBrief, result),
          ...clearPromptResults(),
        });
      },
      applyPipeline: (companyName, industry, result) => {
        const { brief, inspirationMode, minimalismLevel } = applyPipelineToBrief(
          get().designBrief,
          result,
        );
        set({
          companyName,
          industry,
          designBrief: brief,
          ...(inspirationMode ? { inspirationMode } : {}),
          ...(result.brandDNA?.visualTraits?.era
            ? { preferredEra: result.brandDNA.visualTraits.era }
            : {}),
          minimalismLevel,
          ...clearPromptResults(),
        });
      },
      setResults: (prompts, recommendations) =>
        set({
          prompts,
          recommendations,
          selectedPromptId: prompts[0]?.id ?? null,
          generatedImages: {},
          generatingPromptId: null,
        }),
      selectPrompt: (selectedPromptId) => set({ selectedPromptId }),
      setGenerating: (generatingPromptId) => set({ generatingPromptId }),
      setGeneratedImages: (promptId, images) =>
        set((state) => ({
          generatedImages: { ...state.generatedImages, [promptId]: images },
        })),
    }),
    {
      name: 'logo-platform-session',
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          ...saved,
          preferredEra: saved.preferredEra ?? '',
          designBrief: { ...EMPTY_DESIGN_BRIEF, ...saved.designBrief },
        };
      },
      partialize: (state) => ({
        industry: state.industry,
        companyName: state.companyName,
        variationCount: state.variationCount,
        inspirationMode: state.inspirationMode,
        preferredEra: state.preferredEra,
        minimalismLevel: state.minimalismLevel,
        designBrief: state.designBrief,
        prompts: state.prompts,
        recommendations: state.recommendations,
        selectedPromptId: state.selectedPromptId,
        generatedImages: state.generatedImages,
      }),
    },
  ),
);

const EMPTY_IMAGES: GeneratedImage[] = [];

export function usePromptImages(promptId: string): GeneratedImage[] {
  return useAppStore((state) => state.generatedImages[promptId] ?? EMPTY_IMAGES);
}

export function useIsGenerating(promptId: string): boolean {
  return useAppStore((state) => state.generatingPromptId === promptId);
}

export function useHasDesignBrief(): boolean {
  return useAppStore((state) => state.designBrief.sources.length > 0);
}
