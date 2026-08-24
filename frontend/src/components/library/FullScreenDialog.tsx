import { type ReactNode, type RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

type FullScreenDialogProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel?: string;
  /** So focus returns to whatever opened the dialog on close — same reasoning as
   * BottomSheet's triggerRef: Radix's own return-focus-to-trigger only applies when
   * a `Dialog.Trigger` opened it, not when `open` is driven externally by state, as
   * every caller here does. Optional: omit it to fall back to Radix's default. */
  triggerRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
};

/** A Radix Dialog that covers the whole viewport rather than sliding up from an edge
 * (BottomSheet) or sitting centered (ConfirmDialog) — for flows that need the same
 * "full-screen modal" chrome as a routed form (SubjectForm) but have no route of
 * their own, e.g. CardForm's in-editor role inside DeckEditor.
 *
 * z-50/z-60, strictly above AppShell's header (z-40) — the opposite of SideDrawer's
 * z-20/z-30, which *deliberately* leaves the header on top so its hamburger button
 * keeps working as the close control. A full-screen dialog has no such reason to
 * leave anything showing through: it's meant to cover the entire viewport, and at
 * z-30 the header (search bar included) painted over its own top content instead. */
export default function FullScreenDialog({ open, onClose, ariaLabel, triggerRef, children }: FullScreenDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-(--color-scrim)" />
        <Dialog.Content
          aria-label={ariaLabel}
          onCloseAutoFocus={(event) => {
            if (triggerRef?.current) {
              event.preventDefault();
              triggerRef.current.focus();
            }
          }}
          className="fixed inset-0 z-60 flex flex-col overflow-y-auto bg-(--color-surface) p-4 focus:outline-none"
        >
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
