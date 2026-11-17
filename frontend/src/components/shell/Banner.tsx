import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

const GROUND = {
  wrong: 'bg-(--color-wrong)',
  ink: 'bg-(--color-ink)',
} as const;

type BannerProps = {
  /** The banner's ground: `wrong` for a failure, `ink` for what is said. */
  color: 'wrong' | 'ink';
  Icon?: LucideIcon;
  children: string;
};

/** One line of white words across the top of every page, announced to a screen reader as a
 * status. */
export default function Banner({ color, Icon, children }: BannerProps): ReactNode {
  return (
    <div
      role="status"
      className={`flex items-center gap-2 ${GROUND[color]} px-4 py-2 text-sm text-(--color-surface)`}
    >
      {Icon && <Icon aria-hidden className="h-4 w-4 shrink-0" />}
      {children}
    </div>
  );
}
