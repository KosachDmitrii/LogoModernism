import type { ReactNode } from 'react';
import { type AppNavId, getNavItem } from '../lib/navigation';

interface PageHeaderProps {
  page: AppNavId;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ page, subtitle, actions, children }: PageHeaderProps) {
  const { label, icon: Icon } = getNavItem(page);

  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2 text-zinc-100">
            <Icon size={22} className="text-violet-400 shrink-0" />
            {label}
          </h1>
          {subtitle && <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
