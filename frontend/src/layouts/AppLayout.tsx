import { NavLink, Outlet } from 'react-router-dom';
import { APP_NAV } from '../lib/navigation';
import { useT } from '../i18n';
import { useAuth } from '../auth/AuthProvider';
import { hasPermission } from '../auth/permissions';

export function AppLayout() {
  const t = useT();
  const { profile, activeMembership } = useAuth();
  const canUseProduct = hasPermission(activeMembership?.role, 'product.use');
  const initials = (profile?.name || profile?.email || 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div className="app-shell min-h-screen flex bg-zinc-950 text-zinc-100">
      <aside className="app-sidebar sticky top-0 self-start h-screen w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-5 border-b border-zinc-800">
          <h1 className="text-base font-semibold tracking-tight">{t('layout.appTitle')}</h1>
          <div className="mt-3 flex min-w-0 items-center gap-2.5">
            <div className="account-avatar grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-300">
                {profile?.name || profile?.email}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-medium tracking-wider text-violet-400">
                {activeMembership?.role}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {APP_NAV.filter((item) => item.id !== 'prompts' || canUseProduct).map(({ to, labelKey, icon: Icon, end }) => (
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

        <div className="px-5 py-3 border-t border-zinc-800/80">
          <p className="text-[10px] font-mono text-zinc-700 tracking-wider">{t('layout.version')}</p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
