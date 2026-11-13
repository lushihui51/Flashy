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
  children: ReactNode;
};

/** The shell's bottom-sheet primitive: scrim, rounded-top panel, drag handle. Used by
 * AccountSheet and CreateSheet — anything anchored to the bottom edge with this shape
 * should build on this rather than repeating the Dialog wiring. The panel is never taller
 * than the room beneath the app's header: a child that scrolls gives up its height first, and
 * past that the panel scrolls. */
export default function BottomSheet({
  open,
  onClose,
  triggerRef,
  id,
  ariaLabel,
  ariaLabelledBy,
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
          className="fixed inset-0 z-20 bg-(--color-ink)/50"
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
          // The header is drawn above every sheet, so a panel taller than the room beneath it
          // would have its top covered.
          className="fixed inset-x-0 bottom-0 z-30 flex max-h-[calc(100dvh-var(--app-header-height))] flex-col gap-4 overflow-y-auto rounded-t-block ruled-top bg-(--color-surface) p-4 pb-6 focus:outline-none"
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
