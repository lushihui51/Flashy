import { type Ref } from 'react';
import { Menu, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from 'src/components/shell/Logo';
import AuthSlot from 'src/components/shell/AuthSlot';
import { PRACTICE_NAV } from 'src/components/shell/navItems';

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
    <div className="flex h-14 w-full items-center gap-3 border-b border-(--color-surface-elevated) bg-(--color-surface) px-3">
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
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-(--color-text-muted)"
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>

      <Logo />

      <div className="flex-1" />

      <div className="flex shrink-0 items-center gap-1">
        {/* Practice sits beside Create because it is the other thing the app is for.
            Same destination as the drawer's own Practice item, from the same constant. */}
        <Link
          to={PRACTICE_NAV.to}
          className="flex h-11 shrink-0 items-center gap-1 px-2 text-sm font-medium text-(--color-text)"
        >
          <PRACTICE_NAV.icon aria-hidden="true" className="h-4 w-4" />
          {PRACTICE_NAV.label}
        </Link>

        <button
          ref={createButtonRef}
          type="button"
          onClick={onCreateClick}
          className="flex h-11 shrink-0 items-center gap-1 px-2 text-sm font-medium text-(--color-text)"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Create
        </button>

        {/* Fixed-width so swapping Log in <-> avatar never shifts layout. */}
        <div data-testid="auth-slot" className="flex h-11 w-24 shrink-0 items-center justify-end">
          <AuthSlot onAvatarClick={onAvatarClick} avatarButtonRef={avatarButtonRef} />
        </div>
      </div>
    </div>
  );
}
