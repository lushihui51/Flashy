import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Renders below the description — for a caller that wants the failed mutation's
   * error inline in the dialog instead of closing it and showing the error elsewhere
   * on the page (the practice detail page's delete). */
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Centered confirm prompt, shared by any destructive or dirty-state confirmation
 * (deck delete, deck-editor cancel-with-changes, field and card delete). A
 * separate shape from BottomSheet, which is specifically for the bottom-anchored
 * sheets (Account, Create) — a confirm reads better centered, not slid up from an
 * edge meant for navigation-style content.
 *
 * z-70/z-80, above AppShell's header (z-40) and every sheet (z-20/z-30): a confirm
 * opened from inside another layer must always win that stack, not render underneath
 * it and become invisible/unclickable. */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          data-testid="confirm-scrim"
          className="fixed inset-0 z-70 bg-(--color-ink)/50"
        />
        <Dialog.Content
          aria-describedby={undefined}
          className="tappable fixed inset-x-5 top-1/2 z-80 flex -translate-y-1/2 flex-col gap-3.5 rounded-block bg-(--color-surface) p-5 focus:outline-none"
        >
          <Dialog.Title className="text-title font-bold text-(--color-ink)">
            {title}
          </Dialog.Title>
          <Dialog.Description className="text-body leading-normal font-light text-(--color-ink)">
            {description}
          </Dialog.Description>
          {children}
          <div className="mt-1 flex gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="tappable h-12 flex-1 rounded-2xl bg-(--color-surface) text-base font-semibold text-(--color-ink)"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="tappable h-12 flex-1 rounded-2xl bg-(--color-ink) text-base font-semibold text-(--color-surface)"
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
