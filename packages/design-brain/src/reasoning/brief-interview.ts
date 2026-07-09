import type { BriefContext, BriefInterviewQuestion } from '@logo-platform/shared';
import type { ClientVisualIntent } from '@logo-platform/shared';

export interface BriefInterviewResult {
  questions: BriefInterviewQuestion[];
  readinessScore: number;
  summary: string;
}

export function buildBriefInterview(
  intent: ClientVisualIntent,
  brief?: BriefContext,
  options?: { markType?: string },
): BriefInterviewResult {
  const questions: BriefInterviewQuestion[] = [];
  const notes = brief?.clientNotes?.trim() ?? '';

  if (!notes || notes.length < 20) {
    questions.push({
      id: 'business-essence',
      prompt: 'What should someone feel when they see this logo for the first time?',
      why: 'Emotional intent guides abstraction level and form language.',
      field: 'clientNotes',
    });
  }

  if (intent.desiredMotifs.length === 0) {
    questions.push({
      id: 'desired-motifs',
      prompt: 'Are there specific shapes, symbols, or references you want reinforced (not copied)?',
      why: 'Desired motifs become positive design strategy — not literal clipart.',
      field: 'clientNotes',
      options: ['Abstract geometry only', 'Stylized industry cue', 'Open to designer interpretation'],
    });
  }

  if (intent.forbiddenMotifs.length === 0) {
    questions.push({
      id: 'forbidden-motifs',
      prompt: 'Anything you explicitly do NOT want in the logo?',
      why: 'Only explicit client prohibitions go into the Avoid section.',
      field: 'constraints',
    });
  }

  if (!brief?.colorPalette || brief.colorPalette === 'auto') {
    questions.push({
      id: 'color-palette',
      prompt: 'Color preference: strict black & white, monochrome, or limited accent palette?',
      why: 'Color system must be locked before prompt generation.',
      field: 'colorPalette',
      options: ['black_white', 'monochrome', 'two_color', 'limited'],
    });
  }

  if (!options?.markType) {
    questions.push({
      id: 'mark-type',
      prompt: 'Wordmark, lettermark, or combination mark (symbol + name)?',
      why: 'Mark architecture drives the entire composition system.',
      field: 'personality',
      options: ['wordmark', 'lettermark', 'combination'],
    });
  }

  const answeredFields = [
    notes.length > 20,
    intent.desiredMotifs.length > 0 || intent.abstractionLevel === 'abstract',
    intent.forbiddenMotifs.length > 0,
    Boolean(brief?.colorPalette && brief.colorPalette !== 'auto'),
    Boolean(options?.markType),
  ].filter(Boolean).length;

  const readinessScore = Math.round((answeredFields / 5) * 100);

  return {
    questions: questions.slice(0, 5),
    readinessScore,
    summary:
      readinessScore >= 80
        ? 'Brief is strong — Brain can build a precise design strategy.'
        : readinessScore >= 50
          ? 'Brief is partial — a few answers will significantly improve results.'
          : 'Brief is thin — interview questions will unlock better abstraction control.',
  };
}
