import type { LucideIcon } from 'lucide-react';
import { DynamicIcon, type IconName } from 'lucide-react/dynamic';

const size = 36;
const className = 'bg-main text-small-text rounded-lg p-2';

export default function CardIcon({
  icon,
  fallbackIcon: FallbackIconComponent,
}: {
  icon?: string | null;
  fallbackIcon: LucideIcon;
}) {
  if (!icon) {
    return <FallbackIconComponent size={size} className={className} />;
  }
  return <DynamicIcon name={icon as IconName} size={size} className={className} />;
}
