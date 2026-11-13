import { Home, Library, Zap, type LucideIcon } from 'lucide-react';

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
};

export const PRACTICE_NAV: NavItem = { label: 'All practices', to: '/practices', icon: Zap };

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', to: '/', icon: Home, end: true },
  { label: 'Your library', to: '/library', icon: Library },
  PRACTICE_NAV,
];
