import clsx from 'clsx';
import { Moon, Sun } from 'lucide-react';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { useT } from '../i18n';
import { useThemeStore, type Theme } from '../theme/theme-store';
import { Tooltip } from './ui/Tooltip';

const THEMES: Array<{ id: Theme; icon: typeof Sun; key: 'common.themeLight' | 'common.themeDark' }> = [
  { id: 'light', icon: Sun, key: 'common.themeLight' },
  { id: 'dark', icon: Moon, key: 'common.themeDark' },
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const activeIndex = THEMES.findIndex((item) => item.id === theme);

  return (
    <div
      className={clsx('flex items-center gap-3 px-0.5', !compact && 'justify-between')}
      role="group"
      aria-label={t('common.theme')}
    >
      {!compact && (
        <div className="flex items-center gap-1.5 min-w-0">
          <Sun size={13} className="text-zinc-600 shrink-0" strokeWidth={1.5} />
          <span className="text-xs text-zinc-500 truncate">{t('common.theme')}</span>
        </div>
      )}

      <ToggleGroup
        value={[theme]}
        onValueChange={(values) => {
          const next = values[0] as Theme | undefined;
          if (next) setTheme(next);
        }}
        aria-label={t('common.theme')}
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

        {THEMES.map(({ id, icon: Icon, key }) => {
          const isActive = theme === id;
          return (
            <Tooltip key={id} content={t(key)}>
            <Toggle
              key={id}
              value={id}
              aria-label={t(key)}
              className={clsx(
                'relative z-10 w-8 py-1 rounded-md flex items-center justify-center transition-colors duration-150',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-500/50',
                isActive ? 'text-zinc-100' : 'text-zinc-600 hover:text-zinc-400',
              )}
            >
              <Icon size={13} strokeWidth={1.75} />
            </Toggle>
            </Tooltip>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
