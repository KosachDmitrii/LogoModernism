import clsx from 'clsx';
import { Globe } from 'lucide-react';
import { useLocaleStore, useT, type Locale, type MessageKey } from '../i18n';

const LOCALES: Array<{ id: Locale; key: MessageKey }> = [
  { id: 'en', key: 'common.langEn' },
  { id: 'ru', key: 'common.langRu' },
];

export function LanguageSwitcher() {
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const activeIndex = LOCALES.findIndex((item) => item.id === locale);

  return (
    <div
      className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
      role="group"
      aria-label={t('common.language')}
    >
      <div className="flex items-center gap-2 mb-2.5 px-0.5">
        <Globe size={15} className="text-zinc-500 shrink-0" strokeWidth={1.75} />
        <span className="text-sm font-medium text-zinc-400">{t('common.language')}</span>
      </div>

      <div className="relative grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-950/90 ring-1 ring-inset ring-zinc-800/80">
        <div
          aria-hidden
          className={clsx(
            'pointer-events-none absolute top-1 bottom-1 w-[calc(50%-6px)] rounded-lg',
            'bg-gradient-to-b from-violet-500/20 to-violet-600/5',
            'border border-violet-500/30',
            'shadow-[0_0_16px_-4px_rgba(139,92,246,0.35)]',
            'transition-[left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          )}
          style={{ left: activeIndex === 0 ? '4px' : 'calc(50% + 2px)' }}
        />

        {LOCALES.map(({ id, key }) => {
          const isActive = locale === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setLocale(id)}
              className={clsx(
                'relative z-10 py-2 rounded-lg text-sm font-semibold tracking-wide transition-colors duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
                isActive ? 'text-violet-100' : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              {t(key)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
