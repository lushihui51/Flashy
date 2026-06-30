import { Home, BookOpen, Layers, Zap, type LucideIcon } from 'lucide-react';

type NavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: Home },
  { label: 'Subjects', path: '/subjects', icon: BookOpen },
  { label: 'Decks', path: '/decks', icon: Layers },
  { label: 'Practices', path: '/practices', icon: Zap },
];
