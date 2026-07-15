import clsx from 'clsx';
import { Globe } from 'lucide-react';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { useLocaleStore, useT, type Locale, type MessageKey } from '../i18n';

const LOCALES: Array<{ id: Locale; key: MessageKey }> = [
  { id: 'en', key: 'common.langEn' },
  { id: 'ru', key: 'common.langRu' },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const activeIndex = LOCALES.findIndex((item) => item.id === locale);

  return (
    <div
      className={clsx('flex items-center gap-3 px-0.5', !compact && 'justify-between')}
      role="group"
      aria-label={t('common.language')}
    >
      {!compact && (
        <div className="flex items-center gap-1.5 min-w-0">
          <Globe size={13} className="text-zinc-600 shrink-0" strokeWidth={1.5} />
          <span className="text-xs text-zinc-500 truncate">{t('common.language')}</span>
        </div>
      )}

      <ToggleGroup
        value={[locale]}
        onValueChange={(values) => {
          const next = values[0] as Locale | undefined;
          if (next) setLocale(next);
        }}
        aria-label={t('common.language')}
        className="relative flex shrink-0 p-0.5 rounded-lg bg-zinc-900/80 ring-1 ring-zinc-800/60"
      >
        <div
          aria-hidden
          className={clsx(
            'pointer-events-none absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-md',
            'bg-zinc-800/90 border border-zinc-700/50',
            'transition-[left] duration-200 ease-out',
          )}
          style={{ left: activeIndex === 0 ? '2px' : 'calc(50%)' }}
        />

        {LOCALES.map(({ id, key }) => {
          const isActive = locale === id;
          return (
            <Toggle
              key={id}
              value={id}
              className={clsx(
                'relative z-10 w-8 py-1 rounded-md text-[11px] font-medium tracking-wide transition-colors duration-150',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-500/50',
                isActive ? 'text-zinc-100' : 'text-zinc-600 hover:text-zinc-400',
              )}
            >
              {t(key)}
            </Toggle>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
