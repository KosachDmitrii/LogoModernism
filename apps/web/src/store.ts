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

const MAX_CACHED_IMAGES = 3;

interface AppState {
  industry: string;
  companyName: string;
  variationCount: number;
  inspirationMode: string;
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

function trimImageCache(
  cache: Record<string, GeneratedImage[]>,
  promptId: string,
  images: GeneratedImage[],
): Record<string, GeneratedImage[]> {
  const next = { ...cache, [promptId]: images };
  const keys = Object.keys(next);

  if (keys.length <= MAX_CACHED_IMAGES) {
    return next;
  }

  const evict = keys.filter((key) => key !== promptId).slice(0, keys.length - MAX_CACHED_IMAGES);
  for (const key of evict) {
    delete next[key];
  }

  return next;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      industry: '',
      companyName: '',
      variationCount: 10,
      inspirationMode: '',
      minimalismLevel: 8,
      designBrief: { ...EMPTY_DESIGN_BRIEF },
      prompts: [],
      recommendations: [],
      selectedPromptId: null,
      generatedImages: {},
      generatingPromptId: null,
      setIndustry: (industry) => set({ industry }),
      setCompanyName: (companyName) => set({ companyName }),
      setVariationCount: (variationCount) => set({ variationCount }),
      setInspirationMode: (inspirationMode) => set({ inspirationMode }),
      setMinimalismLevel: (minimalismLevel) => set({ minimalismLevel }),
      updateDesignBrief: (patch) =>
        set((state) => ({
          designBrief: { ...state.designBrief, ...patch },
        })),
      clearDesignBrief: () => set({ designBrief: { ...EMPTY_DESIGN_BRIEF } }),
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
          minimalismLevel,
        });
      },
      applyGeometry: (industry, result) => {
        set({
          industry: industry || get().industry,
          designBrief: applyGeometryToBrief(get().designBrief, result),
        });
      },
      applyKnowledgeGraph: (result) => {
        set({
          designBrief: applyKnowledgeGraphToBrief(get().designBrief, result),
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
          minimalismLevel,
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
          generatedImages: trimImageCache(state.generatedImages, promptId, images),
        })),
    }),
    {
      name: 'logo-platform-session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        industry: state.industry,
        companyName: state.companyName,
        variationCount: state.variationCount,
        inspirationMode: state.inspirationMode,
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
