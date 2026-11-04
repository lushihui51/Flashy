import { type ReactNode, type RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  /** So focus returns to whatever opened the sheet on close — see SideDrawer's
   * triggerRef for why this is manual rather than Radix's own trigger tracking. */
  triggerRef: RefObject<HTMLButtonElement | null>;
  id?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  /** Stacks the sheet at z-70/z-80, above FullScreenDialog's z-50/z-60, for a sheet
   * opened from inside one; otherwise it would open behind the dialog it came from. */
  aboveDialogs?: boolean;
  children: ReactNode;
};

/** The shell's bottom-sheet primitive: scrim, rounded-top panel, drag handle. Used by
 * AccountSheet and CreateSheet — anything anchored to the bottom edge with this shape
 * should build on this rather than repeating the Dialog wiring. */
export default function BottomSheet({
  open,
  onClose,
  triggerRef,
  id,
  ariaLabel,
  ariaLabelledBy,
  aboveDialogs = false,
  children,
}: BottomSheetProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          data-testid="scrim"
          className={`fixed inset-0 ${aboveDialogs ? 'z-70' : 'z-20'} bg-(--color-ink)/50`}
        />
        <Dialog.Content
          id={id}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-modal="true"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
          className={`fixed inset-x-0 bottom-0 ${aboveDialogs ? 'z-80' : 'z-30'} flex flex-col gap-4 rounded-t-[20px] border-t-[1.5px] border-(--color-ink) bg-(--color-surface) p-4 pb-6 focus:outline-none`}
        >
          <div
            aria-hidden="true"
            className="mx-auto h-1.5 w-10 rounded-full bg-(--color-line)"
          />
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
