import PickerCombobox from 'src/components/ui/PickerCombobox';
import SubjectIcon from 'src/components/library/SubjectIcon';

type SubjectOption = { id: string; name: string; icon?: string | null };
type DeckOption = { id: string; name: string; subject_id: string };

type PracticeFilterBarProps = {
  /** Both lists arrive already fetched — this component takes its data as props like
   * every other shared component (AGENTS.md), so the page owns the queries. */
  subjects: SubjectOption[];
  decks: DeckOption[];
  subjectId: string | null;
  deckId: string | null;
  onChange: (next: { subjectId: string | null; deckId: string | null }) => void;
};

/** The subject + deck filter pair, shared by the practice overview and the session
 * creation surface so both narrow by the same rules.
 *
 * Two decks in different subjects may share a name, so the deck filter is always by
 * **id** and the subject is what disambiguates it in the list. Selecting a subject
 * narrows the deck options to that subject and drops a deck selection outside it;
 * selecting a deck fills in its subject, since a deck outside the chosen subject would
 * make the two filters contradict each other and match nothing. */
export default function PracticeFilterBar({
  subjects,
  decks,
  subjectId,
  deckId,
  onChange,
}: PracticeFilterBarProps) {
  const deckOptions = subjectId ? decks.filter((deck) => deck.subject_id === subjectId) : decks;
  const selectedSubject = subjects.find((subject) => subject.id === subjectId) ?? null;
  const selectedDeck = decks.find((deck) => deck.id === deckId) ?? null;

  // The picker's input is a form field's height wherever it stands; a filter sits 0.25rem shorter.
  return (
    <div className="flex gap-2.5 [&_input]:h-10.5" data-testid="practice-filters">
      <div className="min-w-0 flex-1">
        <PickerCombobox<SubjectOption>
          purpose="filter"
          items={subjects}
          selected={selectedSubject}
          onSelect={(subject) =>
            onChange({
              subjectId: subject.id,
              // A deck from another subject would contradict the new subject filter.
              deckId: selectedDeck?.subject_id === subject.id ? selectedDeck.id : null,
            })
          }
          clearLabel="All subjects"
          onClear={() => onChange({ subjectId: null, deckId })}
          placeholder="All subjects"
          renderLeading={(subject) => <SubjectIcon icon={subject.icon} className="h-4 w-4" />}
        />
      </div>
      <div className="min-w-0 flex-1">
        <PickerCombobox<DeckOption>
          purpose="filter"
          items={deckOptions}
          selected={selectedDeck}
          onSelect={(deck) => onChange({ subjectId: deck.subject_id, deckId: deck.id })}
          clearLabel="All decks"
          onClear={() => onChange({ subjectId, deckId: null })}
          placeholder="All decks"
        />
      </div>
    </div>
  );
}
