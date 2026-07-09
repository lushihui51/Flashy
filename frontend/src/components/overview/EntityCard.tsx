// components/overview/EntityCard.tsx
import CardIcon from 'src/components/overview/CardIcon';
import type { LucideIcon } from 'lucide-react';
import { SquarePen, Trash2 } from 'lucide-react';

type EntityCardProps = {
  icon?: string | null;
  fallbackIcon: LucideIcon;
  name: string;
  description?: string | null;
  fallbackDescription: string;
  countLabel?: string;
  count?: number;
  footerLabel: string;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function EntityCard({
  icon,
  fallbackIcon,
  name,
  description,
  fallbackDescription,
  countLabel,
  count,
  footerLabel,
  onClick,
  onEdit,
  onDelete,
}: EntityCardProps) {
  return (
    <div className="relative rounded-xl pt-4 px-4 pb-2 bg-accent">
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <CardIcon icon={icon} fallbackIcon={fallbackIcon} />
          {countLabel && count !== undefined && (
            <span className="bg-main rounded-lg flex items-center px-2 text-sm text-small-text">
              {countLabel}: {count}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="z-10 relative">
            <SquarePen size={15} className="text-small-text cursor-pointer" />
          </button>
          <button onClick={onDelete} className="z-10 relative">
            <Trash2 size={15} className="text-small-text cursor-pointer" />
          </button>
        </div>
      </div>
      <div className="my-2 py-1">
        <h3 className="text-lg font-bold">{name}</h3>
        {description ? (
          <p className="text-sm text-small-text">{description}</p>
        ) : (
          <p className="text-sm text-small-text italic">{fallbackDescription}</p>
        )}
      </div>
      <button className="absolute inset-0 z-0 cursor-pointer rounded-xl" onClick={onClick} />

      <div className="border-t-2 border-gray-200 text-sm text-small-text py-2 flex justify-between items-center">
        <div>{footerLabel}</div>
        <div>&gt;</div>
      </div>
    </div>
  );
}
