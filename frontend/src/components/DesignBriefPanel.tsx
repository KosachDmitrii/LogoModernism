import { useAppStore } from '../store';
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

const BRIEF_FIELD_KEYS: Array<{ key: TextBriefField; labelKey: MessageKey; rows?: number }> = [
  { key: 'personality', labelKey: 'brief.panel.field.personality' },
  { key: 'complexity', labelKey: 'brief.panel.field.complexity' },
  { key: 'primaryEmotion', labelKey: 'brief.panel.field.primaryEmotion' },
  { key: 'narrative', labelKey: 'brief.panel.field.narrative', rows: 3 },
  { key: 'geometry', labelKey: 'brief.panel.field.geometry' },
  { key: 'construction', labelKey: 'brief.panel.field.construction' },
  { key: 'preferredShapes', labelKey: 'brief.panel.field.preferredShapes' },
  { key: 'composition', labelKey: 'brief.panel.field.composition' },
  { key: 'typography', labelKey: 'brief.panel.field.typography' },
  { key: 'constraints', labelKey: 'brief.panel.field.constraints' },
  { key: 'clientNotes', labelKey: 'brief.panel.field.clientNotes', rows: 3 },
  { key: 'bestPromptHint', labelKey: 'brief.panel.field.bestPromptHint', rows: 3 },
  { key: 'critiqueNote', labelKey: 'brief.panel.field.critique' },
];

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

  return (
    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-zinc-400">{t('brief.panel.summary')}</p>
          <p className="text-xs text-zinc-600 mt-0.5">{t('brief.panel.editable')}</p>
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

      {designBrief.era.trim() && (
        <p className="text-xs text-zinc-300">
          <span className="text-zinc-500">{t('brief.panel.era')}</span>{' '}
          {designBrief.era}
          <span className="text-zinc-500"> ({t(getEraSourceKey(designBrief))})</span>
        </p>
      )}

      {designBrief.markType && (
        <p className="text-xs text-zinc-300">
          <span className="text-zinc-500">{t('brief.panel.markType')}</span> {markTypeLabel(designBrief.markType, t)}
        </p>
      )}

      {designBrief.typographyStyle && (
        <p className="text-xs text-zinc-300">
          <span className="text-zinc-500">{t('brief.panel.typographyStyle')}</span>{' '}
          {typographyStyleLabel(designBrief.typographyStyle, t)}
        </p>
      )}

      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">{t('brief.panel.colorPalette')}</label>
        <select
          value={designBrief.colorPalette}
          onChange={(e) =>
            updateDesignBrief({
              colorPalette: e.target.value as DesignBrief['colorPalette'],
            })
          }
          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
        >
          {COLOR_OPTIONS.map((option) => (
            <option key={option.value || 'empty'} value={option.value}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
      </div>

      {(designBrief.colorSelections.length > 0 || designBrief.allowShadows || designBrief.allowPhotoreal) && (
        <div className="space-y-1">
          {designBrief.colorSelections.length > 0 && (
            <p className="text-xs text-zinc-300">
              <span className="text-zinc-500">{t('brief.panel.selectedColors')}</span>{' '}
              {designBrief.colorSelections.join(', ')}
            </p>
          )}
          {(designBrief.allowShadows || designBrief.allowPhotoreal) && (
            <p className="text-xs text-zinc-300">
              <span className="text-zinc-500">{t('brief.panel.effectsAllowed')}</span>{' '}
              {[
                designBrief.allowShadows ? t('brief.panel.shadows') : '',
                designBrief.allowPhotoreal ? t('brief.panel.photoreal') : '',
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </div>
      )}

      {(designBrief.catalogReferenceIds?.length ?? 0) > 0 && (
        <p className="text-xs text-zinc-300">
          <span className="text-zinc-500">{t('brief.panel.catalogRefs')}</span>{' '}
          {designBrief.catalogReferenceIds.length}
        </p>
      )}

      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
        {BRIEF_FIELD_KEYS.map(({ key, labelKey, rows }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-zinc-500 mb-1">{t(labelKey)}</label>
            {rows ? (
              <textarea
                value={designBrief[key]}
                onChange={(e) => updateDesignBrief({ [key]: e.target.value })}
                rows={rows}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 resize-none"
              />
            ) : (
              <input
                value={designBrief[key]}
                onChange={(e) => updateDesignBrief({ [key]: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
