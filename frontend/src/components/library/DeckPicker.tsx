import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { readDecks } from 'src/api/deck';
import PickerCombobox from 'src/components/library/PickerCombobox';

/** Only what the picker itself actually needs to display — satisfied by DeckSummary
 * (the `items` list, from readDecks), DeckDetail (whatever readDeck/createDeck
 * return), or a hand-built object a caller already has in memory. Deliberately
 * narrower than either full schema so none of them need reshaping just to pass
 * through. */
export type DeckPickerItem = { id: string; name: string };

type DeckPickerProps = {
  /** Preselects on mount (a true "default": later changes to this prop are ignored)
   * — this is how a contextual entry point (deck detail's "New card") or a
   * returned-from-deck-creation round-trip (§4) sets the starting deck without
   * removing the choice to change it, or a static chip when `locked`. */
  defaultValue?: DeckPickerItem | null;
  /** Static chip, no combobox — card **edit** mode only (a card can't move between
   * decks); create mode is always editable, contextual or not (D1). */
  locked?: boolean;
  onChange: (deckId: string) => void;
  /** The create row was chosen. Deliberately a plain callback with no built-in
   * confirm/navigate logic (unlike SubjectPicker's own overlay, §3) — a deck editor
   * is too heavy to nest in a dialog, so this always means leaving the page, and only
   * the caller (CardStandaloneForm) knows whether there's a confirm to run first. */
  onCreateNew: () => void;
};

/** Deck combobox (§4.4), rebuilt in Phase 5.5 on the shared PickerCombobox. No inline
 * create (D4: creating a card never creates a deck) — the create row instead hands
 * off to the caller, which navigates to the deck editor and returns. The old in-list
 * "you have no decks" empty state is gone: PickerCombobox's create row already
 * handles zero items on its own (§2). */
export default function DeckPicker({ defaultValue = null, locked, onChange, onCreateNew }: DeckPickerProps) {
  const decksQuery = useQuery({ queryKey: ['decks'], queryFn: () => readDecks() });
  const items = decksQuery.data ?? [];

  // Owned internally, not just a pass-through of `defaultValue` — PickerCombobox
  // compares its displayed text against this `selected` item's name to decide
  // whether reopening should show the full list or a filtered one (see its
  // `hasEditedSinceSelection` comment). If `selected` never advanced past the
  // original `defaultValue`, picking a *new* item would leave that comparison
  // pointing at the wrong name and reopening would wrongly filter by it.
  const [selected, setSelected] = useState<DeckPickerItem | null>(defaultValue);

  return (
    <PickerCombobox<DeckPickerItem>
      items={items}
      selected={selected}
      onSelect={(item) => {
        setSelected(item);
        onChange(item.id);
      }}
      onSelectCreate={onCreateNew}
      createLabel="New deck…"
      placeholder="Deck"
      locked={locked}
    />
  );
}
