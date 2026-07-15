import {
  Brain,
  BookOpen,
  Heart,
  LayoutDashboard,
  LibraryBig,
  Settings,
  Sparkles,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import type { MessageKey } from '../i18n';

export type AppNavId =
  | 'home'
  | 'prompts'
  | 'saved'
  | 'brain'
  | 'catalog'
  | 'principles'
  | 'pricing'
  | 'settings';

export interface AppNavItem {
  id: AppNavId;
  to: string;
  labelKey: MessageKey;
  icon: LucideIcon;
  end?: boolean;
  guestVisible?: boolean;
}

export const APP_NAV: AppNavItem[] = [
  {
    id: 'home',
    to: '/',
    labelKey: 'nav.home',
    icon: LayoutDashboard,
    end: true,
    guestVisible: true,
  },
  { id: 'prompts', to: '/prompts', labelKey: 'nav.prompts', icon: Sparkles },
  {
    id: 'catalog',
    to: '/logo-catalog',
    labelKey: 'nav.catalog',
    icon: BookOpen,
    guestVisible: true,
  },
  {
    id: 'principles',
    to: '/principles',
    labelKey: 'nav.principles',
    icon: LibraryBig,
    guestVisible: true,
  },
  { id: 'saved', to: '/saved', labelKey: 'nav.saved', icon: Heart },
  { id: 'brain', to: '/brain', labelKey: 'nav.brain', icon: Brain, guestVisible: true },
  {
    id: 'pricing',
    to: '/pricing',
    labelKey: 'nav.pricing',
    icon: WalletCards,
    guestVisible: true,
  },
  { id: 'settings', to: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export function getNavItem(id: AppNavId): AppNavItem {
  const item = APP_NAV.find((nav) => nav.id === id);
  if (!item) throw new Error(`Unknown nav item: ${id}`);
  return item;
}
