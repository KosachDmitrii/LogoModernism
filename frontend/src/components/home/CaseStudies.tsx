import { ArrowRight } from 'lucide-react';
import { useT, type MessageKey } from '../../i18n';
import { MARKS, type CaseId } from './case-marks';

const CASES: Array<{
  id: CaseId;
  industry: MessageKey;
  brief: MessageKey;
  dirs: [MessageKey, MessageKey, MessageKey];
}> = [
  {
    id: 'fintech',
    industry: 'home.case1Industry',
    brief: 'home.case1Brief',
    dirs: ['home.case1D1', 'home.case1D2', 'home.case1D3'],
  },
  {
    id: 'architecture',
    industry: 'home.case2Industry',
    brief: 'home.case2Brief',
    dirs: ['home.case2D1', 'home.case2D2', 'home.case2D3'],
  },
  {
    id: 'culture',
    industry: 'home.case3Industry',
    brief: 'home.case3Brief',
    dirs: ['home.case3D1', 'home.case3D2', 'home.case3D3'],
  },
];

export function CaseStudies() {
  const t = useT();

  return (
    <section className="mt-14">
      <div className="max-w-2xl">
        <h3 className="text-lg font-semibold text-zinc-100">{t('home.casesTitle')}</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-500">{t('home.casesSubtitle')}</p>
      </div>

      <div className="mt-8 space-y-6">
        {CASES.map((item) => {
          const marks = MARKS[item.id];
          const Before = marks.before;

          return (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50"
            >
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-800/80 px-5 py-4 md:px-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                    {t(item.industry)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">{t(item.brief)}</p>
                </div>
                <p className="text-[11px] text-zinc-600">{t('home.caseDemoNote')}</p>
              </div>

              <div className="grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_auto_minmax(0,1.35fr)]">
                <div className="p-5 md:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-zinc-800 text-zinc-400">
                      {t('home.caseBefore')}
                    </span>
                  </div>
                  <div className="rounded-xl border border-zinc-700/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                    <Before />
                  </div>
                </div>

                <div className="hidden items-center justify-center px-1 lg:flex">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400">
                    <ArrowRight size={16} />
                  </div>
                </div>

                <div className="border-t border-zinc-800/80 p-5 md:border-t-0 md:border-l md:border-zinc-800/80 md:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-zinc-100 text-zinc-800">
                      {t('home.caseAfter')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {marks.after.map((Node, index) => (
                      <div key={item.dirs[index]} className="min-w-0">
                        <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-1">
                          <Node />
                        </div>
                        <p className="mt-2 text-[11px] leading-4 text-zinc-500">
                          <span className="font-mono text-zinc-600">{index + 1}. </span>
                          {t(item.dirs[index]!)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
