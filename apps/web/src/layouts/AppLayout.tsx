import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  Dna,
  Shapes,
  Network,
  BookOpen,
  ClipboardCheck,
  Workflow,
  MessageSquareWarning,
} from 'lucide-react';
import clsx from 'clsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/prompts', label: 'Prompts', icon: Sparkles },
  { to: '/brand-dna', label: 'Brand DNA', icon: Dna },
  { to: '/geometry', label: 'Geometry', icon: Shapes },
  { to: '/knowledge-graph', label: 'Knowledge Graph', icon: Network },
  { to: '/logo-catalog', label: 'Logo Catalog', icon: BookOpen },
  { to: '/catalog-review', label: 'Catalog Review', icon: ClipboardCheck },
  { to: '/pipeline', label: 'Full Pipeline', icon: Workflow },
  { to: '/critic', label: 'Logo Critic', icon: MessageSquareWarning },
];

export function AppLayout() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r border-zinc-800 bg-zinc-950 flex flex-col shrink-0">
        <div className="p-5 border-b border-zinc-800">
          <h1 className="text-sm font-semibold tracking-tight">AI BIOS</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Logo Design Platform</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900',
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-zinc-800">
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Enterprise v1.0</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
