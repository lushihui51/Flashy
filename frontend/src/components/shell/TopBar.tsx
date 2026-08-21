import { type Ref } from 'react';
import { Menu } from 'lucide-react';
import Logo from 'src/components/shell/Logo';
import AuthSlot from 'src/components/shell/AuthSlot';

type TopBarProps = {
  onMenuClick: () => void;
  isMenuOpen: boolean;
  onAvatarClick: () => void;
  menuButtonRef?: Ref<HTMLButtonElement>;
};

export default function TopBar({
  onMenuClick,
  isMenuOpen,
  onAvatarClick,
  menuButtonRef,
}: TopBarProps) {
  return (
    <div className="flex h-14 w-full items-center gap-3 border-b border-(--color-surface-elevated) bg-(--color-surface) px-3">
      <button
        ref={menuButtonRef}
        type="button"
        onClick={onMenuClick}
        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isMenuOpen}
        aria-controls="side-drawer"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-(--color-text-muted)"
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>

      <Logo />

      <div className="flex-1" />

      {/* TODO(defer:nav-targets) Create is visible/focusable but does nothing yet. */}
      <button
        type="button"
        className="h-11 shrink-0 px-3 text-sm font-medium text-(--color-text)"
      >
        + Create
      </button>

      {/* Fixed-width so swapping Log in <-> avatar never shifts layout. */}
      <div data-testid="auth-slot" className="flex h-11 w-24 shrink-0 items-center justify-end">
        <AuthSlot onAvatarClick={onAvatarClick} />
      </div>
    </div>
  );
}
