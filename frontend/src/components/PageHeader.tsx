import type { ReactNode } from 'react';
import { type AppNavId, getNavItem } from '../lib/navigation';
import { useT } from '../i18n';

interface PageHeaderProps {
  page: AppNavId;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ page, subtitle, actions, children }: PageHeaderProps) {
  const t = useT();
  const { labelKey, icon: Icon } = getNavItem(page);

  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2.5 text-zinc-100">
            <Icon size={26} className="text-violet-400 shrink-0" />
            {t(labelKey)}
          </h1>
          {subtitle && <p className="text-base text-zinc-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
