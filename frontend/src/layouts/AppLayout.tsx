import { NavLink, Outlet } from 'react-router-dom';
import { BrainIngestBanner } from '../components/BrainIngestBanner';
import { APP_NAV } from '../lib/navigation';

export function AppLayout() {
  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-100">
      <aside className="sticky top-0 self-start h-screen w-60 border-r border-zinc-800 bg-zinc-950 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-5 border-b border-zinc-800">
          <h1 className="text-sm font-semibold tracking-tight">Logo Design Platform</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Admin</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {APP_NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-violet-900/40 text-violet-100'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60'
                }`
              }
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider">v1.0</p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        <BrainIngestBanner />
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
