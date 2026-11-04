import { type Ref } from 'react';
import { useUser, useClerk } from '@clerk/react';

type AuthSlotProps = {
  onAvatarClick: () => void;
  avatarButtonRef?: Ref<HTMLButtonElement>;
};

function initialsFor(user: {
  firstName?: string | null;
  lastName?: string | null;
  primaryEmailAddress?: { emailAddress: string } | null;
}): string {
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.trim();
  if (initials) return initials.toUpperCase();
  const email = user.primaryEmailAddress?.emailAddress;
  return email ? email[0]!.toUpperCase() : '?';
}

// @clerk/react (unlike @clerk/clerk-react) has no <SignedIn>/<SignedOut>
// components, so this branches on useUser()'s isLoaded/isSignedIn directly.
export default function AuthSlot({ onAvatarClick, avatarButtonRef }: AuthSlotProps) {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();

  if (!isLoaded) {
    return (
      <div
        aria-hidden="true"
        className="h-[38px] w-[38px] shrink-0 rounded-full bg-(--color-ground)"
      />
    );
  }

  if (!isSignedIn || !user) {
    return (
      <button
        type="button"
        onClick={() => clerk.openSignIn()}
        className="h-11 shrink-0 rounded-full bg-(--color-main-action) px-4 text-sm font-semibold text-(--color-ink)"
      >
        Log in
      </button>
    );
  }

  const name =
    user.fullName ?? user.username ?? user.primaryEmailAddress?.emailAddress ?? 'Account';

  return (
    <button
      ref={avatarButtonRef}
      type="button"
      onClick={onAvatarClick}
      aria-label={`Account menu for ${name}`}
      className="h-[38px] w-[38px] shrink-0 overflow-hidden rounded-full border-[1.5px] border-(--color-ink) bg-(--color-surface)"
    >
      {user.imageUrl ? (
        <img src={user.imageUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-(--color-ink)">
          {initialsFor(user)}
        </span>
      )}
    </button>
  );
}
