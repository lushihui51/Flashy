import { useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { readDecks } from 'src/api/deck';
import { createPractice } from 'src/api/practice';
import DeckPicker from 'src/components/library/DeckPicker';
import FormBar from 'src/components/ui/FormBar';
import SubmitButton from 'src/components/ui/SubmitButton';
import { failureSentence } from 'src/lib/failureSentence';
import { useLeaveForm } from 'src/lib/leaveForm';
import { usePageTitle } from 'src/lib/pageTitle';
import { internalReturnTo, returnAddressParams } from 'src/lib/returnTo';
import { useViewParams } from 'src/lib/viewParams';

const DECK_PARAM = 'deck';

/** `params` with its `deck` params exactly `deckIds`, in order, every other param kept. */
function withDecks(params: URLSearchParams, deckIds: readonly string[]): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete(DECK_PARAM);
  for (const id of deckIds) next.append(DECK_PARAM, id);
  return next;
}

/**
 * `/practices/new`: Name and the decks, picked through the deck picker and listed beneath.
 * The picks, in the order picked, and a typed name ride the URL, as one `deck` param per
 * pick and a `name` param, so a refresh or a round trip through New deck keeps them.
 * Create lands on `returnTo`, else on the new practice's page; Cancel on `cancelTo`, else
 * All practices.
 */
export default function PracticeCreatePage() {
  usePageTitle('New practice');
  const { params, setParams } = useViewParams();
  const navigate = useNavigate();
  const leaveForm = useLeaveForm();
  const location = useLocation();
  const queryClient = useQueryClient();
  const nameInputId = useId();
  const [saveError, setSaveError] = useState<string | null>(null);

  const deckIds = [...new Set(params.getAll(DECK_PARAM))];
  // Read from the URL once, at mount, so a refresh or a round trip comes back to what was
  // typed. The input stays bound to this buffer, which mirrors each change to the URL, so
  // the caret stays where it is while the URL's write lands.
  const [name, setName] = useState(() => params.get('name') ?? '');

  const decksQuery = useQuery({ queryKey: ['decks'], queryFn: () => readDecks() });
  const decks = decksQuery.data ?? [];
  const pickedDecks = deckIds.flatMap((id) => decks.filter((deck) => deck.id === id));
  const unpicked = decks.filter((deck) => !deckIds.includes(deck.id));
  // A `deck` param naming no deck of the user's, typed in or left from a deleted deck, is
  // neither counted nor sent.
  const pickedIds = pickedDecks.map((deck) => deck.id);

  // New deck hands back the deck it made once, as `location.state.deckId`; the ref keeps a
  // later render from adding it again after the user removes it.
  const returnedDeckId = (location.state as { deckId?: string } | null)?.deckId ?? null;
  const appliedReturnedDeck = useRef(false);
  useEffect(() => {
    if (appliedReturnedDeck.current || !returnedDeckId) return;
    appliedReturnedDeck.current = true;
    const picked = params.getAll(DECK_PARAM);
    if (!picked.includes(returnedDeckId)) setParams(withDecks(params, [...picked, returnedDeckId]));
  }, [returnedDeckId, params, setParams]);

  const createMutation = useMutation({
    mutationFn: () => createPractice({ name: name.trim() || null, deck_ids: pickedIds }),
    onSuccess: async (practice) => {
      await queryClient.invalidateQueries({ queryKey: ['practices'] });
      await leaveForm(internalReturnTo(params, 'returnTo') ?? `/practices/${practice.id}`);
    },
    onError: (error: Error) => setSaveError(failureSentence(error, 'Deck not found.')),
  });

  const changeName = (value: string) => {
    setName(value);
    const next = new URLSearchParams(params);
    if (value) next.set('name', value);
    else next.delete('name');
    setParams(next);
  };

  const newDeck = () => {
    navigate({
      pathname: '/decks/new',
      search: returnAddressParams(location, 'cancelTo', 'returnTo').toString(),
    });
  };

  const cancel = () => void leaveForm(internalReturnTo(params, 'cancelTo') ?? '/practices');

  return (
    <div className="p-4">
      <h1 className="text-page leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
        New practice
      </h1>

      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor={nameInputId} className="text-label text-(--color-aside)">
          Name
        </label>
        <input
          id={nameInputId}
          type="text"
          value={name}
          onChange={(event) => changeName(event.target.value)}
          className="h-field rounded-field outlined-line bg-(--color-surface) px-3.5 text-base text-(--color-ink)"
        />
      </div>

      <div className="mt-3">
        <DeckPicker
          items={unpicked}
          selected={null}
          onSelect={(deck) => setParams(withDecks(params, [...deckIds, deck.id]))}
          placeholder="Choose decks"
          createLabel="New deck…"
          onSelectCreate={newDeck}
        />
      </div>

      {pickedDecks.length > 0 && (
        <ul className="tappable mt-3 flex flex-col divide-y divide-(--color-line) rounded-block bg-(--color-surface)">
          {pickedDecks.map((deck) => (
            <li key={deck.id} className="flex items-center gap-1.5 pr-1 pl-4">
              <span className="min-w-0 flex-1 truncate py-3 text-body leading-5 font-semibold text-(--color-ink)">
                {deck.name}
              </span>
              <button
                type="button"
                aria-label={`Remove ${deck.name}`}
                onClick={() =>
                  setParams(
                    withDecks(
                      params,
                      deckIds.filter((id) => id !== deck.id),
                    ),
                  )
                }
                className="flex h-11 w-10 shrink-0 items-center justify-center text-(--color-aside)"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <FormBar
        sentence={saveError}
        count={pickedIds.length > 0 ? `${pickedIds.length} selected` : null}
      >
        <button
          type="button"
          onClick={cancel}
          className="tappable shrink-0 h-action rounded-2xl bg-(--color-surface) px-4.5 text-action font-semibold text-(--color-ink)"
        >
          Cancel
        </button>
        <SubmitButton
          ready={pickedIds.length > 0}
          busy={createMutation.isPending}
          onPress={() => {
            setSaveError(null);
            createMutation.mutate();
          }}
        >
          Create
        </SubmitButton>
      </FormBar>
    </div>
  );
}
