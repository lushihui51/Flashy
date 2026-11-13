import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readDeck } from 'src/api/deck';
import { readPractice, savePracticeConfiguration } from 'src/api/practice';
import { readRun } from 'src/api/run';
import type { components } from 'src/api/types';
import { isNotFound } from 'src/api/unwrap';
import FieldAssignmentBoard from 'src/components/library/FieldAssignmentBoard';
import DeckMark from 'src/components/ui/DeckMark';
import FormBar from 'src/components/ui/FormBar';
import FormPart from 'src/components/ui/FormPart';
import MarkedName from 'src/components/ui/MarkedName';
import PracticeMark from 'src/components/ui/PracticeMark';
import SubmitButton from 'src/components/ui/SubmitButton';
import {
  boardFromConfig,
  boardProblem,
  boardToPayload,
  moveField,
  toggleCount,
  type BoardArrays,
  type BoardProblem,
  type BoardSlot,
  type PoolSlot,
} from 'src/lib/deckBoard';
import { failureSentence } from 'src/lib/failureSentence';
import { useLeaveForm } from 'src/lib/leaveForm';
import { usePageTitle } from 'src/lib/pageTitle';
import { internalReturnTo } from 'src/lib/returnTo';
import { useViewParams } from 'src/lib/viewParams';

type DeckDetail = components['schemas']['DeckDetail'];

/**
 * A deck's board as a form, at `/practices/:practiceId/decks/:deckId` and
 * `/runs/:runId/decks/:deckId`. From a practice with no active run it saves how the practice's
 * next run asks the deck: Cancel lands on `cancelTo`, else the practice's page, and Save on
 * `returnTo`, else the practice's page. While the practice has an active run, and always from a
 * run, it shows the board greyed with Done alone, which lands on `cancelTo`, else the practice's
 * or the run's page.
 */
export default function DeckBoardPage() {
  const { practiceId, runId, deckId } = useParams<{
    practiceId?: string;
    runId?: string;
    deckId: string;
  }>();

  const deckQuery = useQuery({
    queryKey: ['deck', deckId],
    queryFn: () => readDeck(deckId!),
    enabled: !!deckId,
  });
  const practiceQuery = useQuery({
    queryKey: ['practice', practiceId],
    queryFn: () => readPractice(practiceId!),
    enabled: !!practiceId,
  });
  const runQuery = useQuery({
    queryKey: ['run_detail', runId],
    queryFn: () => readRun(runId!),
    enabled: !!runId,
  });
  const ownerQuery = runId ? runQuery : practiceQuery;

  // What the page needs of the practice or the run that holds the board, alike for both.
  const practice = practiceQuery.data;
  const run = runQuery.data;
  const owner = runId
    ? run && {
        practiceName: run.practice_name,
        decks: run.decks,
        configurations: run.configurations,
        readOnlyLine: 'How this run asked it.',
        practiceId: null,
        leavesTo: `/runs/${run.id}`,
      }
    : practice && {
        practiceName: practice.name,
        decks: practice.decks,
        configurations: practice.configurations,
        readOnlyLine: practice.active_run_id ? 'A run is active.' : null,
        practiceId: practice.id,
        leavesTo: `/practices/${practice.id}`,
      };

  const deck = deckQuery.data;
  const config = owner?.configurations.find((configuration) => configuration.deck_id === deckId);
  const ownsDeck = owner?.decks.some((ownDeck) => ownDeck.deck_id === deckId) ?? false;
  const shown = deck !== undefined && config !== undefined && ownsDeck;
  usePageTitle(shown ? deck.name : undefined);

  if (deckQuery.isPending || ownerQuery.isPending) {
    return (
      <div className="p-4">
        <p className="text-(--color-aside)">Loading fields…</p>
      </div>
    );
  }
  if (!owner || !deck || !config || !ownsDeck) {
    return (
      <div className="p-4">
        {isNotFound(ownerQuery.error) ? (
          <p className="text-(--color-aside)">{runId ? 'Run not found.' : 'Practice not found.'}</p>
        ) : isNotFound(deckQuery.error) || (owner && deck) ? (
          <p className="text-(--color-aside)">Deck not found.</p>
        ) : (
          <FormPart sentence="Could not load this deck." look="wrong">
            {null}
          </FormPart>
        )}
      </div>
    );
  }

  return (
    <DeckBoardBody
      // A fresh board for each deck, so moves made on one never stand on another.
      key={`${owner.leavesTo}/${deck.id}`}
      deck={deck}
      practiceName={owner.practiceName}
      config={config}
      readOnlyLine={owner.readOnlyLine}
      practiceId={owner.practiceId}
      leavesTo={owner.leavesTo}
    />
  );
}

type DeckBoardBodyProps = {
  deck: DeckDetail;
  practiceName: string;
  config: BoardArrays;
  /** The line above a board that cannot be changed, saying why; null for a board that saves. */
  readOnlyLine: string | null;
  /** The practice the board saves to; null on a run's board. */
  practiceId: string | null;
  /** Where Cancel, Save and Done land when the URL names no return address. */
  leavesTo: string;
};

function DeckBoardBody({
  deck,
  practiceName,
  config,
  readOnlyLine,
  practiceId,
  leavesTo,
}: DeckBoardBodyProps) {
  const { params } = useViewParams();
  const leaveForm = useLeaveForm();
  const queryClient = useQueryClient();
  const [board, setBoard] = useState(() => boardFromConfig(deck.field_defs, config));
  const [problem, setProblem] = useState<BoardProblem | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const readOnly = readOnlyLine !== null;

  const saveMutation = useMutation({
    mutationFn: () => savePracticeConfiguration(practiceId!, deck.id, boardToPayload(board)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['practice', practiceId] });
      await leaveForm(internalReturnTo(params, 'returnTo') ?? leavesTo);
    },
    onError: (error: Error) => setSaveError(failureSentence(error, 'Deck not found.')),
  });

  const leave = () => void leaveForm(internalReturnTo(params, 'cancelTo') ?? leavesTo);

  return (
    <div className="p-4">
      <h1 className="break-words text-page leading-[1.05] font-bold tracking-[-0.02em] text-(--color-ink)">
        <MarkedName mark={<DeckMark />} name={deck.name} />
      </h1>
      <p className="mt-2 break-words text-body text-(--color-aside)">
        <MarkedName mark={<PracticeMark />} name={practiceName} />
      </p>

      {readOnlyLine && <p className="mt-3.5 text-sm text-(--color-aside)">{readOnlyLine}</p>}

      <div className="mt-3.5">
        <FieldAssignmentBoard
          fieldDefs={deck.field_defs}
          state={board}
          problem={problem}
          readOnly={readOnly}
          onMove={(fieldId: string, to: BoardSlot) => {
            setBoard((current) => moveField(current, fieldId, to));
            setProblem(null);
          }}
          onToggleCount={(slot: PoolSlot, count: number) => {
            setBoard((current) => toggleCount(current, slot, count));
            setProblem(null);
          }}
        />
      </div>

      <FormBar sentence={saveError}>
        {readOnly ? (
          <button
            type="button"
            onClick={leave}
            className="tappable h-action flex-1 rounded-2xl bg-(--color-surface) px-4.5 text-action font-semibold text-(--color-ink)"
          >
            Done
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={leave}
              className="tappable shrink-0 h-action rounded-2xl bg-(--color-surface) px-4.5 text-action font-semibold text-(--color-ink)"
            >
              Cancel
            </button>
            <SubmitButton
              ready={boardProblem(board) === null}
              busy={saveMutation.isPending}
              onNotReady={() => setProblem(boardProblem(board))}
              onPress={() => {
                setSaveError(null);
                saveMutation.mutate();
              }}
            >
              Save
            </SubmitButton>
          </>
        )}
      </FormBar>
    </div>
  );
}
