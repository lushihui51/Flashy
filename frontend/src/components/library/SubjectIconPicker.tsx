import type { ReactNode, RefObject } from 'react';
import BottomSheet from 'src/components/ui/BottomSheet';
import SubjectIcon from 'src/components/library/SubjectIcon';
import { SUBJECT_ICONS, subjectIcon } from 'src/lib/subjectIcon';

type SubjectIconPickerProps = {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** The key shown as chosen; blank or unknown marks the default. */
  value: string;
  /** Called with the tapped picture's key; the caller closes the sheet. */
  onChange: (key: string) => void;
};

/** A sheet of every picture a subject can carry, each a button spoken by its name.
 * It stacks above a FullScreenDialog, so it can be opened from a form inside one. */
export default function SubjectIconPicker({
  open,
  onClose,
  triggerRef,
  value,
  onChange,
}: SubjectIconPickerProps): ReactNode {
  const current = subjectIcon(value);
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      triggerRef={triggerRef}
      ariaLabel="Icon"
      aboveDialogs
    >
      <div className="grid grid-cols-6 justify-items-center gap-2">
        {SUBJECT_ICONS.map(({ key, name }) => {
          const pressed = subjectIcon(key) === current;
          return (
            <button
              key={key}
              type="button"
              aria-label={name}
              aria-pressed={pressed}
              onClick={() => onChange(key)}
              className={`tappable-sm flex h-11 w-11 items-center justify-center rounded-xl ${pressed ? 'tappable-pressed bg-(--color-ink) text-(--color-surface)' : 'bg-(--color-surface) text-(--color-ink)'}`}
            >
              <SubjectIcon icon={key} className="h-6 w-6" />
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
