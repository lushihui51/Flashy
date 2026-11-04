import { useId, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/react';
import BottomSheet from 'src/components/ui/BottomSheet';

type AccountSheetProps = {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
};

export default function AccountSheet({ open, onClose, triggerRef }: AccountSheetProps) {
  const nameId = useId();
  const { user } = useUser();
  const clerk = useClerk();
  const navigate = useNavigate();

  const name = user?.username ?? user?.fullName ?? 'Account';
  const email = user?.primaryEmailAddress?.emailAddress ?? '';

  const handleLogOut = async () => {
    await clerk.signOut();
    onClose();
    navigate('/');
  };

  return (
    <BottomSheet open={open} onClose={onClose} triggerRef={triggerRef} ariaLabelledBy={nameId}>
      <div className="flex items-center gap-3">
        {user?.imageUrl ? (
          <img src={user.imageUrl} alt={name} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div
            aria-hidden="true"
            className="h-14 w-14 rounded-full border-[1.5px] border-(--color-ink) bg-(--color-ground)"
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
        className="tappable h-12 rounded-2xl bg-(--color-surface) text-[15px] font-semibold text-(--color-ink)"
      >
        Log out
      </button>
    </BottomSheet>
  );
}
