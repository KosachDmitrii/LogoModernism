import { useAppStore } from '../../store';
import { eraToInspiration } from '../../lib/brief-mappers';

const INSPIRATION_LABELS: Record<string, string> = {
  swiss: 'Swiss',
  bauhaus: 'Bauhaus',
  ibm: 'IBM',
  nasa: 'NASA',
  lufthansa: 'Lufthansa',
  braun: 'Braun',
  cbs: 'CBS',
  abc: 'ABC',
  olivetti: 'Olivetti',
  westinghouse: 'Westinghouse',
};

export function BriefProjectSummary() {
  const industry = useAppStore((s) => s.industry);
  const companyName = useAppStore((s) => s.companyName);
  const preferredEra = useAppStore((s) => s.preferredEra);
  const inspirationMode = useAppStore((s) => s.inspirationMode);
  const designBrief = useAppStore((s) => s.designBrief);

  const era = designBrief.era.trim() || preferredEra.replace(/_/g, ' ');
  const inspiration =
    inspirationMode ||
    (designBrief.era.trim() ? eraToInspiration(designBrief.era) : '');
  const brandLabel = companyName.trim() ? companyName.trim() : 'Symbol only (no name)';

  return (
    <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
        From Project
      </p>
      <div className="flex flex-wrap gap-1.5">
        {industry.trim() && <Chip label={industry} />}
        <Chip label={brandLabel} muted={!companyName.trim()} />
        {era && <Chip label={era} />}
        {inspiration && (
          <Chip label={INSPIRATION_LABELS[inspiration] ?? inspiration.replace(/_/g, ' ')} />
        )}
      </div>
      <p className="text-[10px] text-zinc-600">
        Change industry, name, or era on the{' '}
        <span className="text-zinc-500">Project</span> step.
      </p>
    </div>
  );
}

function Chip({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${
        muted
          ? 'border-zinc-700 bg-zinc-900 text-zinc-400'
          : 'border-zinc-700 bg-zinc-800/60 text-zinc-300'
      }`}
    >
      {label}
    </span>
  );
}
