import * as Dialog from '@radix-ui/react-dialog';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Renders the confirm button in the danger palette — for actions that delete or
   * otherwise cannot be undone. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Centered confirm prompt, shared by any destructive or dirty-state confirmation
 * (subject delete, deck-editor cancel-with-changes, and later field/card delete). A
 * separate shape from BottomSheet, which is specifically for the bottom-anchored
 * sheets (Account, Create) — a confirm reads better centered, not slid up from an
 * edge meant for navigation-style content.
 *
 * z-70/z-80, strictly above FullScreenDialog's z-50/z-60: a confirm can be opened
 * from *inside* a FullScreenDialog (e.g. SubjectPicker's "New subject…" overlay has
 * its own unsaved-changes confirm) and must always win that stack, not render
 * underneath it and become invisible/unclickable. */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive,
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
        <Dialog.Overlay data-testid="confirm-scrim" className="fixed inset-0 z-70 bg-(--color-scrim)" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-4 top-1/2 z-80 -translate-y-1/2 rounded-2xl bg-(--color-surface) p-4 focus:outline-none"
        >
          <Dialog.Title className="text-base font-semibold text-(--color-text)">{title}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-(--color-text-secondary)">
            {description}
          </Dialog.Description>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-11 flex-1 rounded-full bg-(--color-surface-elevated) text-sm font-semibold text-(--color-text)"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`h-11 flex-1 rounded-full text-sm font-semibold ${
                destructive
                  ? 'bg-(--color-danger) text-(--color-danger-contrast)'
                  : 'bg-(--color-primary) text-(--color-primary-contrast)'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
