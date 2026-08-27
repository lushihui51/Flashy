import { Home, Library, Zap, Bell, type LucideIcon } from 'lucide-react';

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
};

/** Practice is reachable from two nav levels (top bar and side drawer), which is fine —
 * but they must be the same destination, so both read it from here rather than each
 * hard-coding a path of their own. No query params: the top-level entry point is the
 * unfiltered list. */
export const PRACTICE_NAV: NavItem = { label: 'Practice', to: '/practice', icon: Zap };

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', to: '/', icon: Home, end: true },
  { label: 'Your library', to: '/library', icon: Library },
  PRACTICE_NAV,
  { label: 'Notifications', to: '/notifications', icon: Bell },
];
