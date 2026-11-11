import DeckPicker from 'src/components/library/DeckPicker';

type DeckOption = { id: string; name: string };

type PracticeFilterBarProps = {
  decks: DeckOption[];
  /** The deck the list is narrowed to; null for every deck. */
  deckId: string | null;
  onChange: (next: { deckId: string | null }) => void;
};

/** The deck filter shared by All practices and New practice, so both narrow by the same
 * rules. */
export default function PracticeFilterBar({ decks, deckId, onChange }: PracticeFilterBarProps) {
  const selectedDeck = decks.find((deck) => deck.id === deckId) ?? null;

  // The picker's input is a form field's height wherever it stands; a filter sits 0.25rem shorter.
  return (
    <div className="[&_input]:h-10.5" data-testid="practice-filters">
      <DeckPicker<DeckOption>
        purpose="filter"
        items={decks}
        selected={selectedDeck}
        onSelect={(deck) => onChange({ deckId: deck.id })}
        clearLabel="All decks"
        onClear={() => onChange({ deckId: null })}
        placeholder="All decks"
      />
    </div>
  );
}
