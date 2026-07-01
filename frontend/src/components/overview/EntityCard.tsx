// components/overview/EntityCard.tsx
import CardIcon from 'src/components/overview/CardIcon';
import type { LucideIcon } from 'lucide-react';
import DeleteCardButton from './DeleteCardButton';
import EditCardButton from './EditCardButton';

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
    <div className="relative rounded-xl border pt-4 px-4 pb-2">
      <CardIcon icon={icon} fallbackIcon={fallbackIcon} />
      {countLabel && count !== undefined && (
        <span>
          {countLabel}: {count}
        </span>
      )}
      {description ? (
        <p className="text-sm text-gray-500">{description}</p>
      ) : (
        <p className="text-sm text-gray-500 italic">{fallbackDescription}</p>
      )}
      {name}
      <button className="absolute inset-0 z-0 cursor-pointer rounded-xl" onClick={onClick} />
      <div className="z-10 relative">
        <EditCardButton handleEditCard={onEdit} />
      </div>
      <div className="z-10 relative">
        <DeleteCardButton handleDeleteCard={onDelete} />
      </div>
      <div className="border-t-2 border-gray-200 py-2">{footerLabel}</div>
    </div>
  );
}
