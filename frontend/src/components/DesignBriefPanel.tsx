import { useCallback, useLayoutEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { isRebusTypographyStyle } from '@logo-platform/shared';
import type { DesignBrief } from '../types';
import { getEraSourceKey } from '../lib/brief-mappers';
import { briefSourceLabel, markTypeLabel, typographyStyleLabel } from '../lib/translate-labels';
import { useT, type MessageKey } from '../i18n';

const COLOR_OPTIONS: Array<{ value: DesignBrief['colorPalette']; labelKey: MessageKey }> = [
  { value: '', labelKey: 'brief.style.autoFromRules' },
  { value: 'auto', labelKey: 'brief.style.autoExplicit' },
  { value: 'black_white', labelKey: 'brief.style.blackWhite' },
  { value: 'monochrome', labelKey: 'brief.style.monochrome' },
  { value: 'two_color', labelKey: 'brief.style.twoColor' },
  { value: 'multi_color', labelKey: 'brief.style.multiColor' },
  { value: 'corporate_blue', labelKey: 'brief.style.corporateBlue' },
  { value: 'red_accent', labelKey: 'brief.style.redAccent' },
  { value: 'limited', labelKey: 'brief.style.limited' },
  { value: 'custom', labelKey: 'brief.style.customColors' },
];

type TextBriefField = {
  [K in keyof DesignBrief]: DesignBrief[K] extends string ? K : never;
}[keyof DesignBrief];

/** Fields that flow into the compiler prompt (mood, geometry, composition, avoid, era, complexity). */
const EDITABLE_BRIEF_FIELDS: Array<{ key: TextBriefField; labelKey: MessageKey; multiline?: boolean }> = [
  { key: 'personality', labelKey: 'brief.panel.field.personality', multiline: true },
  { key: 'composition', labelKey: 'brief.panel.field.composition', multiline: true },
  { key: 'preferredShapes', labelKey: 'brief.panel.field.preferredShapes' },
  { key: 'geometry', labelKey: 'brief.panel.field.geometry' },
  { key: 'construction', labelKey: 'brief.panel.field.construction' },
  { key: 'constraints', labelKey: 'brief.panel.field.constraints', multiline: true },
  { key: 'complexity', labelKey: 'brief.panel.field.complexity' },
  { key: 'narrative', labelKey: 'brief.panel.field.narrative', multiline: true },
];

/** Diagnostic / Brand DNA dumps — visible for context, not compiled into prompt text. */
const READONLY_BRIEF_FIELDS: Array<{ key: TextBriefField; labelKey: MessageKey }> = [
  { key: 'primaryEmotion', labelKey: 'brief.panel.field.primaryEmotion' },
  { key: 'typography', labelKey: 'brief.panel.field.typography' },
  { key: 'clientNotes', labelKey: 'brief.panel.field.clientNotes' },
  { key: 'bestPromptHint', labelKey: 'brief.panel.field.bestPromptHint' },
  { key: 'critiqueNote', labelKey: 'brief.panel.field.critique' },
];

const TEXTAREA_CLASS =
  'w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 resize-none overflow-hidden min-h-[2.5rem]';
const INPUT_CLASS =
  'w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600';
const READONLY_VALUE_CLASS =
  'px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs text-zinc-400 whitespace-pre-wrap';

function AutoResizeTextarea({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useLayoutEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => {
        onChange(event);
        requestAnimationFrame(resize);
      }}
      rows={1}
      className={className}
    />
  );
}

function ReadonlyField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <label className="text-xs font-medium text-zinc-500">{label}</label>
        <span className="text-[10px] text-zinc-600 shrink-0">{hint}</span>
      </div>
      <p className={READONLY_VALUE_CLASS}>{value}</p>
    </div>
  );
}

function colorPaletteLabel(
  value: DesignBrief['colorPalette'],
  t: ReturnType<typeof useT>,
): string {
  const option = COLOR_OPTIONS.find((item) => item.value === value);
  return option ? t(option.labelKey) : value;
}

export function DesignBriefPanel() {
  const t = useT();
  const designBrief = useAppStore((s) => s.designBrief);
  const updateDesignBrief = useAppStore((s) => s.updateDesignBrief);
  const clearDesignBrief = useAppStore((s) => s.clearDesignBrief);

  if (designBrief.sources.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center">
        <p className="text-xs text-zinc-500">{t('brief.panel.empty')}</p>
      </div>
    );
  }

  const filledEditableFields = EDITABLE_BRIEF_FIELDS.filter(({ key }) => designBrief[key].trim());
  const filledReadonlyFields = READONLY_BRIEF_FIELDS.filter(({ key }) => designBrief[key].trim());
  const hasColorPalette = Boolean(designBrief.colorPalette);
  const hasStyleExtras =
    designBrief.colorSelections.length > 0 || designBrief.allowShadows || designBrief.allowPhotoreal;
  const hasCatalogRefs = (designBrief.catalogReferenceIds?.length ?? 0) > 0;
  const hasReadonlyMeta =
    Boolean(designBrief.era.trim()) ||
    Boolean(designBrief.markType) ||
    Boolean(designBrief.typographyStyle) ||
    hasColorPalette ||
    hasStyleExtras ||
    hasCatalogRefs;
  const hasFieldContent =
    hasReadonlyMeta || filledEditableFields.length > 0 || filledReadonlyFields.length > 0;

  const buildHint = t('brief.panel.readOnlyBuild');
  const noPromptHint = t('brief.panel.readOnlyNoPrompt');

  return (
    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-zinc-400">{t('brief.panel.summary')}</p>
          {filledEditableFields.length > 0 && (
            <p className="text-xs text-zinc-600 mt-0.5">{t('brief.panel.editable')}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {designBrief.sources.map((source) => (
              <span
                key={source}
                className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300"
              >
                {briefSourceLabel(source, t)}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={clearDesignBrief}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          {t('common.clear')}
        </button>
      </div>

      {!hasFieldContent && (
        <p className="text-xs text-zinc-500">{t('brief.panel.noFieldsYet')}</p>
      )}

      {hasReadonlyMeta && (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-600">{t('brief.panel.readOnlySection')}</p>

          {designBrief.era.trim() && (
            <ReadonlyField
              label={t('brief.panel.era').replace(/:$/, '')}
              value={`${designBrief.era} (${t(getEraSourceKey(designBrief))})`}
              hint={buildHint}
            />
          )}

          {designBrief.markType && (
            <ReadonlyField
              label={t('brief.panel.markType').replace(/:$/, '')}
              value={markTypeLabel(designBrief.markType, t)}
              hint={buildHint}
            />
          )}

          {designBrief.typographyStyle && (
            <ReadonlyField
              label={t('brief.panel.typographyStyle').replace(/:$/, '')}
              value={typographyStyleLabel(designBrief.typographyStyle, t)}
              hint={buildHint}
            />
          )}

          {(isRebusTypographyStyle(
            designBrief.typographyStyle === 'rebus' ? 'rebus' : undefined,
          ) || designBrief.rebusWordmark) && (
            <p className="text-xs text-violet-300/90 px-2 py-1.5 rounded-lg bg-violet-950/30 border border-violet-800/40">
              {t('brief.typography.rebusActive')}
            </p>
          )}

          {hasColorPalette && (
            <ReadonlyField
              label={t('brief.panel.colorPalette')}
              value={colorPaletteLabel(designBrief.colorPalette, t)}
              hint={buildHint}
            />
          )}

          {hasStyleExtras && (
            <ReadonlyField
              label={t('brief.panel.effectsAllowed').replace(/:$/, '')}
              value={[
                designBrief.colorSelections.length > 0
                  ? `${t('brief.panel.selectedColors')} ${designBrief.colorSelections.join(', ')}`
                  : '',
                designBrief.allowShadows ? t('brief.panel.shadows') : '',
                designBrief.allowPhotoreal ? t('brief.panel.photoreal') : '',
              ]
                .filter(Boolean)
                .join(' · ')}
              hint={buildHint}
            />
          )}

          {hasCatalogRefs && (
            <ReadonlyField
              label={t('brief.panel.catalogRefs').replace(/:$/, '')}
              value={String(designBrief.catalogReferenceIds.length)}
              hint={buildHint}
            />
          )}
        </div>
      )}

      {filledEditableFields.length > 0 && (
        <div className="space-y-3">
          {filledEditableFields.map(({ key, labelKey, multiline }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-zinc-500 mb-1">{t(labelKey)}</label>
              {multiline ? (
                <AutoResizeTextarea
                  value={designBrief[key]}
                  onChange={(e) => updateDesignBrief({ [key]: e.target.value })}
                  className={TEXTAREA_CLASS}
                />
              ) : (
                <input
                  value={designBrief[key]}
                  onChange={(e) => updateDesignBrief({ [key]: e.target.value })}
                  className={INPUT_CLASS}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {filledReadonlyFields.length > 0 && (
        <div className="space-y-3 pt-1 border-t border-zinc-800/80">
          {filledReadonlyFields.map(({ key, labelKey }) => (
            <ReadonlyField
              key={key}
              label={t(labelKey)}
              value={designBrief[key]}
              hint={noPromptHint}
            />
          ))}
        </div>
      )}
    </div>
  );
}
