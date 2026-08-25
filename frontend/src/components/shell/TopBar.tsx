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

      {/* Evenly spaced by what the eye actually sees. The avatar fills its 44px circle
          while an icon is only 20px inside a 44px hit box, so equal *boxes* read as
          unequal gaps — the icons sit in 20px-wide boxes instead, and one gap equal to
          the bar's own padding puts the same 12px between each glyph, the avatar, and
          the edge. The hit area is put back with an inset pseudo-element, which enlarges
          the target without taking part in the layout. */}
      <div className="flex shrink-0 items-center gap-3">
        <button
          ref={createButtonRef}
          type="button"
          onClick={onCreateClick}
          aria-label="Create"
          className="relative flex h-11 w-5 shrink-0 items-center justify-center text-(--color-text) after:absolute after:inset-y-0 after:-inset-x-1.5 after:content-['']"
        >
          <Plus aria-hidden="true" className="h-5 w-5" />
        </button>

        {/* Same destination as the drawer's own Practice item, from the same constant. */}
        <Link
          to={PRACTICE_NAV.to}
          aria-label={PRACTICE_NAV.label}
          className="relative flex h-11 w-5 shrink-0 items-center justify-center text-(--color-text) after:absolute after:inset-y-0 after:-inset-x-1.5 after:content-['']"
        >
          <PRACTICE_NAV.icon aria-hidden="true" className="h-5 w-5" />
        </Link>

        {/* Sized by its content, not padded out to a fixed width — that padding was
            what put ~50px of dead space between Create and the avatar. Only the wider
            signed-out "Log in" pill breaks the rhythm, once per load. */}
        <div data-testid="auth-slot" className="flex h-11 shrink-0 items-center">
          <AuthSlot onAvatarClick={onAvatarClick} avatarButtonRef={avatarButtonRef} />
        </div>
      </div>
    </div>
  );
}
