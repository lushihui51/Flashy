import { type RefObject } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BottomSheet from 'src/components/ui/BottomSheet';
import { returnAddressParams } from 'src/lib/returnTo';

type CreateSheetProps = {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** undefined while the deck count is still loading — treated as "don't know yet,"
   * not as zero, so the Card row never flashes the empty-state subline for a user who
   * actually has decks. */
  hasDecks: boolean | undefined;
};

const ROW_CLASS =
  'tappable flex min-h-action w-full items-center rounded-2xl bg-(--color-surface) px-4.5 py-2 text-left';
const LABEL_CLASS = 'text-base font-semibold text-(--color-ink)';

/** The three things a user makes, in the order they nest: a deck holds cards, and a
 * practice is a set of decks. */
export default function CreateSheet({ open, onClose, triggerRef, hasDecks }: CreateSheetProps) {
  const navigate = useNavigate();
  // The sheet has no address of its own, so this is the page beneath it, where the form's
  // Cancel returns.
  const location = useLocation();

  const go = (to: string) => {
    onClose();
    navigate({ pathname: to, search: returnAddressParams(location, 'cancelTo').toString() });
  };

  return (
    <BottomSheet open={open} onClose={onClose} triggerRef={triggerRef} ariaLabel="New">
      <ul className="flex flex-col gap-3">
        <li>
          <button type="button" onClick={() => go('/decks/new')} className={ROW_CLASS}>
            <span className={LABEL_CLASS}>New deck</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => go(hasDecks === false ? '/decks/new' : '/cards/new')}
            className={ROW_CLASS}
          >
            <span className="flex flex-col">
              <span className={LABEL_CLASS}>New card</span>
              {hasDecks === false && (
                <span className="text-sm text-(--color-aside)">Create a deck first</span>
              )}
            </span>
          </button>
        </li>
        <li>
          {/* Straight to where a practice is made, not to the list of practices. */}
          <button type="button" onClick={() => go('/practices/new')} className={ROW_CLASS}>
            <span className={LABEL_CLASS}>New practice</span>
          </button>
        </li>
      </ul>
    </BottomSheet>
  );
}
