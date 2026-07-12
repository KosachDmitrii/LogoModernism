import type { CreativeTerritoryId } from './brain-partner';

export type ConstraintConflictRole = 'brief' | 'output';

export interface ConstraintConflictSide {
  role: ConstraintConflictRole;
  /** Semantic field id for i18n (e.g. colorPalette, forbiddenMotifs) */
  fieldKey: string;
  value: string;
  /** Short excerpt when value is long (prompt text) */
  excerpt?: string;
}

export interface ConstraintResolutionPatch {
  colorPalette?:
    | 'black_white'
    | 'monochrome'
    | 'two_color'
    | 'multi_color'
    | 'corporate_blue'
    | 'red_accent'
    | 'limited'
    | 'custom';
  allowShadows?: boolean;
  allowPhotoreal?: boolean;
  markType?: 'wordmark' | 'lettermark' | 'combination' | '';
  appendConstraints?: string;
  appendClientNotes?: string;
}

export interface ConstraintResolutionCompose {
  preferredTerritoryId?: CreativeTerritoryId;
  appendConstraints?: string;
}

export interface ConstraintResolution {
  id: string;
  briefPatch?: ConstraintResolutionPatch;
  compose?: ConstraintResolutionCompose;
}
