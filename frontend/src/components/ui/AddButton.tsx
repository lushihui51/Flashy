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
      className="tappable-sm flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-(--color-surface) px-3.5 text-body font-semibold text-(--color-ink)"
    >
      <Plus aria-hidden="true" strokeWidth={2.8} className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
