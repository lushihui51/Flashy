import { Home, Library, Zap, Bell, type LucideIcon } from 'lucide-react';

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', to: '/', icon: Home, end: true },
  { label: 'Your library', to: '/library', icon: Library },
  { label: 'Practice', to: '/practice', icon: Zap },
  { label: 'Notifications', to: '/notifications', icon: Bell },
];
