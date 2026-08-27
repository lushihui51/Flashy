import { Plus } from 'lucide-react';

type AddButtonProps = {
  label: string;
  onClick: () => void;
};

/** The one add-control shape: labeled, and rendered inside the collection it adds to.
 * Entity actions belong in a page header; a control that adds to a list belongs with the
 * list, where its label can say what it adds (plan 005, guiding principle 1). */
export default function AddButton({ label, onClick }: AddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-(--color-primary) px-3 text-sm font-semibold text-(--color-primary-contrast)"
    >
      <Plus aria-hidden="true" className="h-4 w-4" />
      {label}
    </button>
  );
}
