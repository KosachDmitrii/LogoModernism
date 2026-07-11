import { NavLink, Outlet } from 'react-router-dom';
import { APP_NAV } from '../lib/navigation';
import { useT } from '../i18n';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export function AppLayout() {
  const t = useT();

  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-100">
      <aside className="sticky top-0 self-start h-screen w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-5 border-b border-zinc-800">
          <h1 className="text-base font-semibold tracking-tight">{t('layout.appTitle')}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{t('layout.adminLabel')}</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {APP_NAV.map(({ to, labelKey, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-violet-900/40 text-violet-100'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800/80 space-y-3">
          <LanguageSwitcher />
          <p className="px-1 text-xs font-mono text-zinc-600 tracking-wider">
            {t('layout.version')}
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
