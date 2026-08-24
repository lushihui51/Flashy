import {
  Atom,
  BookOpen,
  Brain,
  Calculator,
  Camera,
  Code,
  Coins,
  Dna,
  Dumbbell,
  FlaskConical,
  Gavel,
  Globe,
  Heart,
  Headset,
  Landmark,
  Languages,
  Leaf,
  type LucideIcon,
  Microscope,
  Music,
  Palette,
  PenTool,
  Rocket,
  Scale,
  Theater,
  Trophy,
  Utensils,
} from 'lucide-react';

/** subject.icon is an identifier into this curated set (kebab-case, matching how it's
 * typed/stored) — not emoji, not the full lucide-react library. A small, statically-
 * imported set tree-shakes normally; the full ~1737-icon library would ship in the
 * bundle regardless of how many are ever used. Unrecognized names — including the
 * pre-rewrite emoji default "📚" on any row the backfill migration missed — fall back
 * to BookOpen, not blank space or raw text. */
const ICONS: Record<string, LucideIcon> = {
  atom: Atom,
  'book-open': BookOpen,
  brain: Brain,
  calculator: Calculator,
  camera: Camera,
  code: Code,
  coins: Coins,
  dna: Dna,
  dumbbell: Dumbbell,
  'flask-conical': FlaskConical,
  gavel: Gavel,
  globe: Globe,
  heart: Heart,
  headset: Headset,
  landmark: Landmark,
  languages: Languages,
  leaf: Leaf,
  microscope: Microscope,
  music: Music,
  palette: Palette,
  'pen-tool': PenTool,
  rocket: Rocket,
  scale: Scale,
  theater: Theater,
  trophy: Trophy,
  utensils: Utensils,
};

const FALLBACK_ICON = BookOpen;

export function subjectIcon(icon: string | null | undefined): LucideIcon {
  const key = icon?.trim().toLowerCase() ?? '';
  return ICONS[key] ?? FALLBACK_ICON;
}
