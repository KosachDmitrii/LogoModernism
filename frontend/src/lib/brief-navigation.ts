export type BuildSection = 'typography' | 'shapes' | 'style' | 'references' | 'client' | 'analyze';

export const BUILD_SECTIONS: BuildSection[] = [
  'typography',
  'shapes',
  'style',
  'references',
  'client',
  'analyze',
];

export const BRIEF_BUILD_SECTION_KEY = 'brief-build-section';
export const BRIEF_BUILD_ADVANCE_KEY = 'brief-build-advance';
export const PROMPTS_WIZARD_STEP_KEY = 'prompts-wizard-step';

export function returnToBriefBuildSection(section: BuildSection, industry = '') {
  sessionStorage.removeItem(BRIEF_BUILD_ADVANCE_KEY);
  sessionStorage.setItem(BRIEF_BUILD_SECTION_KEY, section);
  sessionStorage.setItem(
    PROMPTS_WIZARD_STEP_KEY,
    String(resolveInitialPromptsWizardStep(industry)),
  );
}

export function resolveInitialPromptsWizardStep(industry: string): 1 | 2 {
  return industry.trim() ? 2 : 1;
}

export function readPromptsWizardReturnStep(): 1 | 2 | 3 | null {
  const step = sessionStorage.getItem(PROMPTS_WIZARD_STEP_KEY);
  sessionStorage.removeItem(PROMPTS_WIZARD_STEP_KEY);
  if (step === '1' || step === '2' || step === '3') {
    return Number(step) as 1 | 2 | 3;
  }
  return null;
}

export function readInitialBuildSection(): BuildSection {
  const advance = sessionStorage.getItem(BRIEF_BUILD_ADVANCE_KEY);
  if (advance && BUILD_SECTIONS.includes(advance as BuildSection)) {
    sessionStorage.removeItem(BRIEF_BUILD_ADVANCE_KEY);
    return advance as BuildSection;
  }
  const saved = sessionStorage.getItem(BRIEF_BUILD_SECTION_KEY);
  if (saved && BUILD_SECTIONS.includes(saved as BuildSection)) {
    return saved as BuildSection;
  }
  return 'typography';
}

export function advanceBriefBuildSection(from: BuildSection) {
  const idx = BUILD_SECTIONS.indexOf(from);
  if (idx >= 0 && idx < BUILD_SECTIONS.length - 1) {
    sessionStorage.setItem(BRIEF_BUILD_ADVANCE_KEY, BUILD_SECTIONS[idx + 1]!);
  }
}

export function rememberBriefBuildSection(section: BuildSection) {
  sessionStorage.setItem(BRIEF_BUILD_SECTION_KEY, section);
}
