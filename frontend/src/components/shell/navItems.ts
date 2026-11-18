import { Home, Info, Library, Shield, Zap, type LucideIcon } from 'lucide-react';

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

// Pages about Flashy itself rather than places a user works in, set apart at the side menu's foot.
export const FOOT_NAV_ITEMS: NavItem[] = [
  { label: 'About', to: '/about', icon: Info },
  { label: 'Privacy', to: '/privacy', icon: Shield },
];
