import { Brain, BookOpen, Heart, LayoutDashboard, Sparkles, type LucideIcon } from 'lucide-react';

export type AppNavId = 'home' | 'prompts' | 'saved' | 'brain' | 'catalog';

export interface AppNavItem {
  id: AppNavId;
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const APP_NAV: AppNavItem[] = [
  { id: 'home', to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { id: 'prompts', to: '/prompts', label: 'Prompts', icon: Sparkles },
  { id: 'catalog', to: '/logo-catalog', label: 'Logo Catalog', icon: BookOpen },
  { id: 'saved', to: '/saved', label: 'Saved', icon: Heart },
  { id: 'brain', to: '/brain', label: 'Brain', icon: Brain },
];

export function getNavItem(id: AppNavId): AppNavItem {
  const item = APP_NAV.find((nav) => nav.id === id);
  if (!item) throw new Error(`Unknown nav item: ${id}`);
  return item;
}
