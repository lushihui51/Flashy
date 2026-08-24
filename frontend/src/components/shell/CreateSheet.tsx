import { type RefObject } from 'react';
import { Folder, Layers, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomSheet from 'src/components/shell/BottomSheet';

type CreateSheetProps = {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** undefined while the deck count is still loading — treated as "don't know yet,"
   * not as zero, so the Card row never flashes the empty-state subline for a user who
   * actually has decks. */
  hasDecks: boolean | undefined;
};

// TODO(defer:icon-picker) Deck and Card rows link to placeholder routes until
// Phase 4 (deck) and Phase 5 (card) build the real forms. Subject is wired to the
// real form as of Phase 3.
export default function CreateSheet({ open, onClose, triggerRef, hasDecks }: CreateSheetProps) {
  const navigate = useNavigate();

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <BottomSheet open={open} onClose={onClose} triggerRef={triggerRef} ariaLabel="Create">
      <ul className="flex flex-col">
        <li>
          <button
            type="button"
            onClick={() => go('/subjects/new')}
            className="flex h-14 w-full items-center gap-3 rounded-xl px-2 text-left"
          >
            <Folder aria-hidden="true" className="h-5 w-5 text-(--color-text-muted)" />
            <span className="font-medium text-(--color-text)">Subject</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => go('/decks/new')}
            className="flex h-14 w-full items-center gap-3 rounded-xl px-2 text-left"
          >
            <Layers aria-hidden="true" className="h-5 w-5 text-(--color-text-muted)" />
            <span className="font-medium text-(--color-text)">Deck</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => go(hasDecks === false ? '/decks/new' : '/cards/new')}
            className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2 text-left"
          >
            <CreditCard aria-hidden="true" className="h-5 w-5 text-(--color-text-muted)" />
            <span className="flex flex-col">
              <span className="font-medium text-(--color-text)">Card</span>
              {hasDecks === false && (
                <span className="text-sm text-(--color-text-muted)">Create a deck first</span>
              )}
            </span>
          </button>
        </li>
      </ul>
    </BottomSheet>
  );
}
