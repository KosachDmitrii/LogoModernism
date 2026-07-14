import clsx from 'clsx';
import { AlertTriangle } from 'lucide-react';
import type { ConstraintReport } from '../../types';
import { useT, type MessageKey } from '../../i18n';

type Violation = ConstraintReport['violations'][number];

const FIELD_LABEL_KEYS: Record<string, MessageKey> = {
  colorPalette: 'prompts.conflict.field.colorPalette',
  forbiddenMotifs: 'prompts.conflict.field.forbiddenMotifs',
  promptText: 'prompts.conflict.field.promptText',
  markType: 'prompts.conflict.field.markType',
  allowShadows: 'prompts.conflict.field.allowShadows',
  allowPhotoreal: 'prompts.conflict.field.allowPhotoreal',
  companyName: 'prompts.conflict.field.companyName',
  constraints: 'prompts.conflict.field.constraints',
};

const RESOLUTION_LABEL_KEYS: Record<string, MessageKey> = {
  keep_brief_recompose: 'prompts.conflict.resolution.keepBrief',
  edit_brand_in_brief: 'prompts.conflict.resolution.editBrand',
  allow_two_color: 'prompts.conflict.resolution.allowTwoColor',
  allow_multi_color: 'prompts.conflict.resolution.allowMultiColor',
  allow_motif: 'prompts.conflict.resolution.allowMotif',
  territory_typography: 'prompts.conflict.resolution.territoryTypography',
  allow_shadows: 'prompts.conflict.resolution.allowShadows',
  allow_photoreal: 'prompts.conflict.resolution.allowPhotoreal',
  allow_wordmark: 'prompts.conflict.resolution.allowWordmark',
  allow_typography: 'prompts.conflict.resolution.allowTypography',
  use_brief_mark_type: 'prompts.conflict.resolution.useBriefMarkType',
  use_brain_mark_type: 'prompts.conflict.resolution.useBrainMarkType',
  prefer_symmetry_recompose: 'prompts.conflict.resolution.preferSymmetry',
  prefer_dynamic_recompose: 'prompts.conflict.resolution.preferDynamic',
  allow_curves_in_brief: 'prompts.conflict.resolution.allowCurves',
};

function fieldLabel(fieldKey: string, t: ReturnType<typeof useT>): string {
  const key = FIELD_LABEL_KEYS[fieldKey];
  return key ? t(key) : fieldKey;
}

const VIOLATION_MESSAGE_KEYS: Record<string, MessageKey> = {
  brand_missing: 'prompts.conflict.violation.brandMissing',
  symbol_only_mark_type: 'prompts.conflict.violation.symbolOnlyMarkType',
  symbol_only_text: 'prompts.conflict.violation.symbolOnlyText',
  palette_violation: 'prompts.conflict.violation.paletteViolation',
  palette_territory_conflict: 'prompts.conflict.violation.paletteTerritoryConflict',
  shadows_forbidden: 'prompts.conflict.violation.shadowsForbidden',
  photoreal_forbidden: 'prompts.conflict.violation.photorealForbidden',
  forbidden_motif: 'prompts.conflict.violation.forbiddenMotif',
  mark_type_mismatch: 'prompts.conflict.violation.markTypeMismatch',
  prompt_too_short: 'prompts.conflict.violation.promptTooShort',
  composition_axis_conflict: 'prompts.conflict.violation.compositionAxisConflict',
  curve_policy_conflict: 'prompts.conflict.violation.curvePolicyConflict',
  mark_architecture_conflict: 'prompts.conflict.violation.markArchitectureConflict',
  mark_type_text_conflict: 'prompts.conflict.violation.markTypeTextConflict',
};

function violationMessage(violation: Violation, t: ReturnType<typeof useT>): string {
  const key = VIOLATION_MESSAGE_KEYS[violation.code];
  return key ? t(key) : violation.message;
}

function resolutionLabel(resolutionId: string, t: ReturnType<typeof useT>): string {
  const key = RESOLUTION_LABEL_KEYS[resolutionId];
  return key ? t(key) : resolutionId;
}

function ConflictSide({
  role,
  fieldKey,
  value,
  excerpt,
}: NonNullable<Violation['briefSide']>) {
  const t = useT();
  const roleLabel =
    role === 'brief' ? t('prompts.conflict.roleBrief') : t('prompts.conflict.roleOutput');

  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-zinc-600 mb-1">{roleLabel}</p>
      <p className="text-[11px] text-zinc-500 mb-0.5">{fieldLabel(fieldKey, t)}</p>
      <p className="text-xs text-zinc-300 break-words">{excerpt ?? value}</p>
    </div>
  );
}

interface ConstraintConflictCardProps {
  violation: Violation;
  selectedResolutionId: string;
  onSelectResolution: (resolutionId: string) => void;
}

export function ConstraintConflictCard({
  violation,
  selectedResolutionId,
  onSelectResolution,
}: ConstraintConflictCardProps) {
  const t = useT();
  const resolutions = violation.resolutions ?? [];

  return (
    <li
      className={clsx(
        'rounded-xl border px-3 py-3 text-xs space-y-3',
        violation.severity === 'error'
          ? 'border-red-500/25 bg-red-500/5'
          : 'border-amber-500/25 bg-amber-500/5',
      )}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          size={12}
          className={clsx(
            'shrink-0 mt-0.5',
            violation.severity === 'error' ? 'text-red-400/80' : 'text-amber-400/80',
          )}
        />
        <div className="min-w-0">
          <p
            className={clsx(
              violation.severity === 'error' ? 'text-red-200/90' : 'text-amber-200/90',
            )}
          >
            {violationMessage(violation, t)}
          </p>
          {violation.suggestion && (
            <p className="text-zinc-500 mt-1 leading-relaxed">{violation.suggestion}</p>
          )}
        </div>
      </div>

      {(violation.briefSide || violation.outputSide) && (
        <div className="grid sm:grid-cols-2 gap-2">
          {violation.briefSide && <ConflictSide {...violation.briefSide} />}
          {violation.outputSide && <ConflictSide {...violation.outputSide} />}
        </div>
      )}

      {resolutions.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-zinc-800/60">
          <p className="text-[11px] text-zinc-500">{t('prompts.conflict.chooseResolution')}</p>
          <ul className="space-y-1.5">
            {resolutions.map((resolution) => (
              <li key={resolution.id}>
                <label
                  className={clsx(
                    'flex items-start gap-2 rounded-lg border px-2.5 py-2 cursor-pointer transition-colors',
                    selectedResolutionId === resolution.id
                      ? 'border-violet-500/40 bg-violet-500/5'
                      : 'border-zinc-800 hover:border-zinc-700',
                  )}
                >
                  <input
                    type="radio"
                    name={`conflict-${violation.id}`}
                    value={resolution.id}
                    checked={selectedResolutionId === resolution.id}
                    onChange={() => onSelectResolution(resolution.id)}
                    className="brief-radio mt-0.5"
                  />
                  <span className="text-zinc-300 leading-relaxed">
                    {resolutionLabel(resolution.id, t)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
