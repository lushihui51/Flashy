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

      {/* One gap value, equal to the bar's own horizontal padding, so the three
          controls sit evenly spaced from each other and from the edge. */}
      <div className="flex shrink-0 items-center gap-3">
        {/* Icon-only, like the hamburger: the bar is chrome, and the words cost more
            width than they earn here. The label moves to aria-label so the accessible
            name is unchanged — the drawer still spells both out. */}
        <Link
          to={PRACTICE_NAV.to}
          aria-label={PRACTICE_NAV.label}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-(--color-text)"
        >
          <PRACTICE_NAV.icon aria-hidden="true" className="h-5 w-5" />
        </Link>

        <button
          ref={createButtonRef}
          type="button"
          onClick={onCreateClick}
          aria-label="Create"
          className="flex h-11 w-11 shrink-0 items-center justify-center text-(--color-text)"
        >
          <Plus aria-hidden="true" className="h-5 w-5" />
        </button>

        {/* Sized by its content, not padded out to a fixed width: the avatar and the
            loading placeholder are both 44px like the two buttons beside them, so the
            row stays even. Only the wider signed-out "Log in" pill differs, and it
            replaces the placeholder once per load. */}
        <div data-testid="auth-slot" className="flex h-11 shrink-0 items-center">
          <AuthSlot onAvatarClick={onAvatarClick} avatarButtonRef={avatarButtonRef} />
        </div>
      </div>
    </div>
  );
}
