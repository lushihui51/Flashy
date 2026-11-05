import { type Ref } from 'react';
import { Menu, Plus } from 'lucide-react';
import Logo from 'src/components/shell/Logo';
import AuthSlot from 'src/components/shell/AuthSlot';

type TopBarProps = {
  onMenuClick: () => void;
  isMenuOpen: boolean;
  onAvatarClick: () => void;
  onCreateClick: () => void;
  menuButtonRef?: Ref<HTMLButtonElement>;
  avatarButtonRef?: Ref<HTMLButtonElement>;
  createButtonRef?: Ref<HTMLButtonElement>;
};

export default function TopBar({
  onMenuClick,
  isMenuOpen,
  onAvatarClick,
  onCreateClick,
  menuButtonRef,
  avatarButtonRef,
  createButtonRef,
}: TopBarProps) {
  return (
    <div className="flex h-14.5 w-full items-center gap-2 bg-(--color-ground) px-4">
      <button
        ref={menuButtonRef}
        type="button"
        onClick={onMenuClick}
        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMenuOpen}
        aria-controls="side-drawer"
        // Inline (not a Tailwind class) so it reliably overrides Radix's
        // own inline `body.style.pointerEvents = 'none'` while the modal
        // drawer is open — an element's own inline style always wins over
        // an inherited one, regardless of any stylesheet's presence.
        style={{ pointerEvents: 'auto' }}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-(--color-ink)"
      >
        <Menu aria-hidden="true" className="size-icon-lg" />
      </button>

      <Logo />

      <div className="flex-1" />

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          ref={createButtonRef}
          type="button"
          onClick={onCreateClick}
          aria-label="New"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-(--color-ink)"
        >
          <Plus aria-hidden="true" className="size-icon-lg" />
        </button>

        <div data-testid="auth-slot" className="flex h-11 shrink-0 items-center">
          <AuthSlot onAvatarClick={onAvatarClick} avatarButtonRef={avatarButtonRef} />
        </div>
      </div>
    </div>
  );
}
