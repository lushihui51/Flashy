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

export type SubjectIconEntry = { key: string; name: string };

/** subject.icon is an identifier into this curated set (kebab-case, matching how it's
 * stored) — not emoji, not the full lucide-react library. A small, statically-
 * imported set tree-shakes normally; the full ~1737-icon library would ship in the
 * bundle regardless of how many are ever used. Unrecognized names — including the
 * pre-rewrite emoji default "📚" on any row the backfill migration missed — fall back
 * to BookOpen, not blank space or raw text. Each name is what a screen reader says
 * for the picture; it is never shown as text. */
const ICONS: readonly (SubjectIconEntry & { component: LucideIcon })[] = [
  { key: 'atom', name: 'Atom', component: Atom },
  { key: 'book-open', name: 'Open book', component: BookOpen },
  { key: 'brain', name: 'Brain', component: Brain },
  { key: 'calculator', name: 'Calculator', component: Calculator },
  { key: 'camera', name: 'Camera', component: Camera },
  { key: 'code', name: 'Code', component: Code },
  { key: 'coins', name: 'Coins', component: Coins },
  { key: 'dna', name: 'DNA', component: Dna },
  { key: 'dumbbell', name: 'Dumbbell', component: Dumbbell },
  { key: 'flask-conical', name: 'Flask', component: FlaskConical },
  { key: 'gavel', name: 'Gavel', component: Gavel },
  { key: 'globe', name: 'Globe', component: Globe },
  { key: 'heart', name: 'Heart', component: Heart },
  { key: 'headset', name: 'Headset', component: Headset },
  { key: 'landmark', name: 'Landmark', component: Landmark },
  { key: 'languages', name: 'Languages', component: Languages },
  { key: 'leaf', name: 'Leaf', component: Leaf },
  { key: 'microscope', name: 'Microscope', component: Microscope },
  { key: 'music', name: 'Music', component: Music },
  { key: 'palette', name: 'Palette', component: Palette },
  { key: 'pen-tool', name: 'Pen', component: PenTool },
  { key: 'rocket', name: 'Rocket', component: Rocket },
  { key: 'scale', name: 'Scale', component: Scale },
  { key: 'theater', name: 'Theater', component: Theater },
  { key: 'trophy', name: 'Trophy', component: Trophy },
  { key: 'utensils', name: 'Utensils', component: Utensils },
];

const BY_KEY = new Map(ICONS.map((entry) => [entry.key, entry]));

const FALLBACK = BY_KEY.get('book-open')!;

/** The curated set in the module's order, each key with its spoken name. */
export const SUBJECT_ICONS: readonly SubjectIconEntry[] = ICONS.map(({ key, name }) => ({
  key,
  name,
}));

function resolve(icon: string | null | undefined) {
  return BY_KEY.get(icon?.trim().toLowerCase() ?? '') ?? FALLBACK;
}

export function subjectIcon(icon: string | null | undefined): LucideIcon {
  return resolve(icon).component;
}

/** The spoken name of a picture; the default's name for a blank or unknown key,
 * matching `subjectIcon`'s fallback. */
export function subjectIconName(icon: string | null | undefined): string {
  return resolve(icon).name;
}
