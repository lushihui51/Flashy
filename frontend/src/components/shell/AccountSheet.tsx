import { useId, useState, type RefObject } from 'react';
import { useUser, useClerk } from '@clerk/react';
import { useMutation } from '@tanstack/react-query';
import { deleteAccount } from 'src/api/account';
import { SERVER_TROUBLE_MESSAGE } from 'src/api/unwrap';
import BottomSheet from 'src/components/ui/BottomSheet';
import ConfirmDialog from 'src/components/ui/ConfirmDialog';
import { failureSentence } from 'src/lib/failureSentence';

type AccountSheetProps = {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

export default function AccountSheet({ open, onClose, triggerRef }: AccountSheetProps) {
  const nameId = useId();
  const { user } = useUser();
  const clerk = useClerk();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    // Awaiting the log-out keeps the confirm pending until it ends. Nothing else is done here:
    // the log-out reloads Home, which closes the sheet and the confirm (ADR 132).
    onSuccess: () => clerk.signOut(),
  });

  const name = user?.username ?? user?.fullName ?? 'Account';
  const email = user?.primaryEmailAddress?.emailAddress ?? '';

  const handleLogOut = async () => {
    await clerk.signOut();
    onClose();
  };

  const handleDeleteCancel = () => {
    // A deletion already sent cannot be called back, so the confirm stays until it answers.
    if (deleteMutation.isPending) return;
    setIsDeleteConfirmOpen(false);
    deleteMutation.reset();
  };

  return (
    <BottomSheet open={open} onClose={onClose} triggerRef={triggerRef} ariaLabelledBy={nameId}>
      <div className="flex items-center gap-3">
        {user?.imageUrl ? (
          <img src={user.imageUrl} alt={name} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div
            aria-hidden="true"
            className="h-14 w-14 rounded-full outlined-ink bg-(--color-ground)"
          />
        )}
        <div>
          <p id={nameId} className="font-semibold text-(--color-ink)">
            {name}
          </p>
          <p className="text-sm text-(--color-aside)">{email}</p>
        </div>
      </div>

      <hr className="border-(--color-line)" />

      <button
        type="button"
        onClick={handleLogOut}
        className="tappable h-12 rounded-2xl bg-(--color-surface) text-body font-semibold text-(--color-ink)"
      >
        Log out
      </button>

      <button
        type="button"
        onClick={() => setIsDeleteConfirmOpen(true)}
        className="tappable h-12 rounded-2xl bg-(--color-surface) text-body font-semibold text-(--color-ink)"
      >
        Delete account
      </button>

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        title="Delete your account?"
        description="Your decks, cards, practices and runs will be gone, with your mastery. This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (!deleteMutation.isPending) deleteMutation.mutate();
        }}
        onCancel={handleDeleteCancel}
      >
        {deleteMutation.isError && (
          <p role="alert" className="text-sm text-(--color-wrong)">
            {/* The route never answers 404. */}
            {failureSentence(deleteMutation.error, SERVER_TROUBLE_MESSAGE)}
          </p>
        )}
      </ConfirmDialog>
    </BottomSheet>
  );
}
