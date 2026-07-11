import { useAppStore } from '../../store';
import { eraToInspiration } from '../../lib/brief-mappers';
import { industryLabel } from '../../lib/translate-labels';
import { useT, type MessageKey } from '../../i18n';

const INSPIRATION_LABEL_KEYS: Record<string, MessageKey> = {
  swiss: 'prompts.inspiration.swiss',
  bauhaus: 'prompts.inspiration.bauhaus',
  ibm: 'prompts.inspiration.ibm',
  nasa: 'prompts.inspiration.nasa',
  lufthansa: 'prompts.inspiration.lufthansa',
  braun: 'prompts.inspiration.braun',
  cbs: 'prompts.inspiration.cbs',
  abc: 'prompts.inspiration.abc',
  olivetti: 'prompts.inspiration.olivetti',
  westinghouse: 'prompts.inspiration.westinghouse',
};

export function BriefProjectSummary() {
  const t = useT();
  const industry = useAppStore((s) => s.industry);
  const companyName = useAppStore((s) => s.companyName);
  const preferredEra = useAppStore((s) => s.preferredEra);
  const inspirationMode = useAppStore((s) => s.inspirationMode);
  const designBrief = useAppStore((s) => s.designBrief);

  const era = designBrief.era.trim() || preferredEra.replace(/_/g, ' ');
  const inspiration =
    inspirationMode ||
    (designBrief.era.trim() ? eraToInspiration(designBrief.era) : '');
  const brandLabel = companyName.trim()
    ? companyName.trim()
    : t('brief.projectSummary.symbolOnly');

  const inspirationLabel = inspiration
    ? INSPIRATION_LABEL_KEYS[inspiration]
      ? t(INSPIRATION_LABEL_KEYS[inspiration])
      : inspiration.replace(/_/g, ' ')
    : '';

  return (
    <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
        {t('brief.projectSummary.title')}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {industry.trim() && <Chip label={industryLabel(industry, t)} />}
        <Chip label={brandLabel} muted={!companyName.trim()} />
        {era && <Chip label={era} />}
        {inspirationLabel && <Chip label={inspirationLabel} />}
      </div>
      <p className="text-xs text-zinc-600">{t('brief.projectSummary.changeOnProject')}</p>
    </div>
  );
}

function Chip({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
        muted
          ? 'border-zinc-700 bg-zinc-900 text-zinc-400'
          : 'border-zinc-700 bg-zinc-800/60 text-zinc-300'
      }`}
    >
      {label}
    </span>
  );
}
