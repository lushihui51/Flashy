import type { LucideIcon } from 'lucide-react';

export default function FallbackIcon({ size, icon }: { size: number; icon: LucideIcon }) {
  const IconComponent = icon as LucideIcon;
  return <IconComponent size={size} />;
}
