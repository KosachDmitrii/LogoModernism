import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  ComposedPrompt,
  DesignBrief,
  GeneratedImage,
  Recommendation,
  SavedProject,
} from './types';
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
    generatingPromptIds: new Set<string>(),
  };
}

function catalogRefsEqual(a: string[] | undefined, b: string[] | undefined): boolean {
  const left = [...(a ?? [])].sort();
  const right = [...(b ?? [])].sort();
  if (left.length !== right.length) return false;
  return left.every((id, index) => id === right[index]);
}

function projectSnapshot(state: AppState): Omit<SavedProject, 'id' | 'name' | 'updatedAt'> {
  return {
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
  };
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
  generatingPromptIds: Set<string>;
  projects: SavedProject[];
  activeProjectId: string | null;
  setIndustry: (v: string) => void;
  setCompanyName: (v: string) => void;
  setVariationCount: (v: number) => void;
  setInspirationMode: (v: string) => void;
  setPreferredEra: (v: string) => void;
  setMinimalismLevel: (v: number) => void;
  updateDesignBrief: (patch: Partial<DesignBrief>) => void;
  clearDesignBrief: () => void;
  resetWizard: () => void;
  applyBrandDNA: (companyName: string, industry: string, result: Parameters<typeof applyBrandDNAToBrief>[1]) => void;
  applyGeometry: (industry: string, result: Parameters<typeof applyGeometryToBrief>[1]) => void;
  applyKnowledgeGraph: (result: Parameters<typeof applyKnowledgeGraphToBrief>[1]) => void;
  applyPipeline: (companyName: string, industry: string, result: Parameters<typeof applyPipelineToBrief>[1]) => void;
  setResults: (prompts: ComposedPrompt[], recommendations: Recommendation[]) => void;
  selectPrompt: (id: string) => void;
  startGenerating: (promptId: string) => void;
  stopGenerating: (promptId: string) => void;
  appendPromptLogo: (promptId: string, image: GeneratedImage) => void;
  setPromptLogos: (promptId: string, logos: GeneratedImage[]) => void;
  setPromptSaved: (promptId: string, saved: boolean) => void;
  updatePromptLogoFeedback: (promptId: string, logoId: string, feedback: import('./types').LogoFeedback) => void;
  syncActiveProject: () => void;
  createProject: (name: string, industry: string, companyName?: string) => string;
  loadProject: (id: string) => void;
  deleteProject: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      industry: '',
      companyName: '',
      variationCount: 1,
      inspirationMode: '',
      preferredEra: '',
      minimalismLevel: 8,
      designBrief: { ...EMPTY_DESIGN_BRIEF },
      prompts: [],
      recommendations: [],
      selectedPromptId: null,
      generatingPromptIds: new Set<string>(),
      projects: [],
      activeProjectId: null,
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
          const styleChanged =
            patch.clientNotes !== undefined ||
            patch.colorPalette !== undefined ||
            patch.colorSelections !== undefined ||
            patch.allowShadows !== undefined ||
            patch.allowPhotoreal !== undefined;
          return catalogChanged || eraChanged || styleChanged
            ? { designBrief, ...clearPromptResults() }
            : { designBrief };
        }),
      clearDesignBrief: () =>
        set({
          designBrief: { ...EMPTY_DESIGN_BRIEF },
          preferredEra: '',
          inspirationMode: '',
          ...clearPromptResults(),
        }),
      resetWizard: () =>
        set({
          industry: '',
          companyName: '',
          variationCount: 5,
          inspirationMode: '',
          preferredEra: '',
          minimalismLevel: 8,
          designBrief: { ...EMPTY_DESIGN_BRIEF },
          activeProjectId: null,
          ...clearPromptResults(),
        }),
      applyBrandDNA: (companyName, industry, result) => {
        const { brief, minimalismLevel } = applyBrandDNAToBrief(
          get().designBrief,
          result,
        );
        set({
          companyName,
          industry,
          designBrief: brief,
          minimalismLevel,
          ...clearPromptResults(),
        });
        get().syncActiveProject();
      },
      applyGeometry: (industry, result) => {
        set({
          industry: industry || get().industry,
          designBrief: applyGeometryToBrief(get().designBrief, result),
          ...clearPromptResults(),
        });
        get().syncActiveProject();
      },
      applyKnowledgeGraph: (result) => {
        set({
          designBrief: applyKnowledgeGraphToBrief(get().designBrief, result),
          ...clearPromptResults(),
        });
      },
      applyPipeline: (companyName, industry, result) => {
        const { brief, minimalismLevel } = applyPipelineToBrief(
          get().designBrief,
          result,
        );
        set({
          companyName,
          industry,
          designBrief: brief,
          minimalismLevel,
          ...clearPromptResults(),
        });
        get().syncActiveProject();
      },
      setResults: (prompts, recommendations) => {
        set({
          prompts,
          recommendations,
          selectedPromptId: prompts[0]?.id ?? null,
          generatingPromptIds: new Set<string>(),
        });
        get().syncActiveProject();
      },
      selectPrompt: (selectedPromptId) => set({ selectedPromptId }),
      startGenerating: (promptId) =>
        set((state) => {
          const next = new Set(state.generatingPromptIds);
          next.add(promptId);
          return { generatingPromptIds: next };
        }),
      stopGenerating: (promptId) =>
        set((state) => {
          const next = new Set(state.generatingPromptIds);
          next.delete(promptId);
          return { generatingPromptIds: next };
        }),
      appendPromptLogo: (promptId, image) => {
        set((state) => ({
          prompts: state.prompts.map((prompt) =>
            prompt.id === promptId
              ? { ...prompt, logos: [...(prompt.logos ?? []), image].slice(0, 3) }
              : prompt,
          ),
        }));
        get().syncActiveProject();
      },
      setPromptLogos: (promptId, logos) => {
        set((state) => ({
          prompts: state.prompts.map((prompt) =>
            prompt.id === promptId ? { ...prompt, logos: logos.slice(0, 3) } : prompt,
          ),
        }));
        get().syncActiveProject();
      },
      setPromptSaved: (promptId, saved) => {
        set((state) => ({
          prompts: state.prompts.map((prompt) =>
            prompt.id === promptId ? { ...prompt, saved } : prompt,
          ),
        }));
        get().syncActiveProject();
      },
      updatePromptLogoFeedback: (promptId, logoId, feedback) => {
        set((state) => ({
          prompts: state.prompts.map((prompt) => {
            if (prompt.id !== promptId) return prompt;
            return {
              ...prompt,
              logos: (prompt.logos ?? []).map((logo) =>
                logo.id === logoId ? { ...logo, feedback } : logo,
              ),
            };
          }),
        }));
        get().syncActiveProject();
      },
      syncActiveProject: () =>
        set((state) => {
          if (!state.activeProjectId) return state;
          const snapshot = projectSnapshot(state);
          return {
            projects: state.projects.map((project) =>
              project.id === state.activeProjectId
                ? {
                    ...project,
                    ...snapshot,
                    name:
                      project.name ||
                      state.companyName ||
                      state.industry ||
                      'Untitled project',
                    updatedAt: Date.now(),
                  }
                : project,
            ),
          };
        }),
      createProject: (name, industry, companyName = '') => {
        const id = crypto.randomUUID();
        set({
          activeProjectId: id,
          industry,
          companyName,
          variationCount: 5,
          inspirationMode: '',
          preferredEra: '',
          minimalismLevel: 8,
          designBrief: { ...EMPTY_DESIGN_BRIEF },
          ...clearPromptResults(),
          projects: [
            {
              id,
              name,
              industry,
              companyName,
              updatedAt: Date.now(),
              variationCount: 5,
              inspirationMode: '',
              preferredEra: '',
              minimalismLevel: 8,
              designBrief: { ...EMPTY_DESIGN_BRIEF },
              prompts: [],
              recommendations: [],
              selectedPromptId: null,
            },
            ...get().projects,
          ],
        });
        return id;
      },
      loadProject: (id) => {
        const project = get().projects.find((item) => item.id === id);
        if (!project) return;
        set({
          activeProjectId: id,
          industry: project.industry,
          companyName: project.companyName,
          variationCount: project.variationCount,
          inspirationMode: project.inspirationMode,
          preferredEra: project.preferredEra,
          minimalismLevel: project.minimalismLevel,
          designBrief: { ...EMPTY_DESIGN_BRIEF, ...project.designBrief },
          prompts: project.prompts,
          recommendations: project.recommendations,
          selectedPromptId: project.selectedPromptId,
          generatingPromptIds: new Set<string>(),
        });
      },
      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== id),
          ...(state.activeProjectId === id
            ? {
                activeProjectId: null,
                industry: '',
                companyName: '',
                designBrief: { ...EMPTY_DESIGN_BRIEF },
                ...clearPromptResults(),
              }
            : {}),
        })),
    }),
    {
      name: 'logo-platform-session',
      version: 2,
      storage: createJSONStorage(() => sessionStorage),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          ...saved,
          preferredEra: saved.preferredEra ?? '',
          designBrief: { ...EMPTY_DESIGN_BRIEF, ...saved.designBrief },
          projects: saved.projects ?? [],
          activeProjectId: saved.activeProjectId ?? null,
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
        projects: state.projects,
        activeProjectId: state.activeProjectId,
      }),
    },
  ),
);

const EMPTY_IMAGES: GeneratedImage[] = [];

export function usePromptImages(promptId: string): GeneratedImage[] {
  return useAppStore((state) => state.prompts.find((prompt) => prompt.id === promptId)?.logos ?? EMPTY_IMAGES);
}

export function useIsGenerating(promptId: string): boolean {
  return useAppStore((state) => state.generatingPromptIds.has(promptId));
}

export function useHasDesignBrief(): boolean {
  return useAppStore((state) => state.designBrief.sources.length > 0);
}
