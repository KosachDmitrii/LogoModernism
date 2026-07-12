import type { BriefContext, BriefInterviewQuestion } from '@logo-platform/shared';
import type { ClientVisualIntent } from '@logo-platform/shared';
import { detectGeometryAxisConflict, hasLockedGeometryPreference } from '@logo-platform/shared';

export interface BriefInterviewResult {
  questions: BriefInterviewQuestion[];
  readinessScore: number;
  summary: string;
}

function briefGeometryHaystack(intent: ClientVisualIntent, brief?: BriefContext): string {
  return [
    brief?.geometry,
    brief?.preferredShapes,
    brief?.clientNotes,
    brief?.narrative,
    brief?.personality,
    brief?.construction,
    ...intent.desiredMotifs,
  ]
    .filter(Boolean)
    .join(' ');
}

export function buildBriefInterview(
  intent: ClientVisualIntent,
  brief?: BriefContext,
  options?: { markType?: string },
): BriefInterviewResult {
  const questions: BriefInterviewQuestion[] = [];
  const notes = brief?.clientNotes?.trim() ?? '';
  const geometryHaystack = briefGeometryHaystack(intent, brief);

  if (
    detectGeometryAxisConflict(geometryHaystack) &&
    !hasLockedGeometryPreference(brief?.geometry, brief?.preferredShapes)
  ) {
    questions.push({
      id: 'geometry-axis',
      prompt:
        'Your brief mixes rigid geometry (circles, quarter arcs, grid) with organic blob shapes. Which should lead?',
      why: 'Image models struggle to combine both — one construction language keeps the mark coherent.',
      field: 'geometry',
      options: ['Geometric circles and quarter arcs', 'Organic blob shapes'],
    });
  }

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
    !detectGeometryAxisConflict(geometryHaystack) ||
      hasLockedGeometryPreference(brief?.geometry, brief?.preferredShapes),
  ].filter(Boolean).length;

  const readinessScore = Math.round((answeredFields / 6) * 100);

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
