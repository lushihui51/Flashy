import { useId, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import FieldValue from 'src/components/practice/FieldValue';
import { RATING_TIERS } from 'src/components/practice/ratingTiers';
import BottomSheet from 'src/components/ui/BottomSheet';
import type { components } from 'src/api/types';

type PracticeSessionBreakdown = components['schemas']['PracticeSessionBreakdown'];
type BreakdownCard = components['schemas']['BreakdownCard'];
type BreakdownBucket = components['schemas']['BreakdownBucket'];

type SessionBreakdownProps = {
  breakdown: PracticeSessionBreakdown;
};

/** ADR 029's one retrospective view: a summary line, four bucket tabs (each with its
 * count), one compact row per card, and a row tap opening the full attempt-by-attempt
 * detail. Doesn't fetch — the run page (once nothing is pending) and the details page
 * (for any completed session) each own the breakdown query and pass the same payload
 * down here, so the view itself can't drift between the two places it's shown. */
const TABS: { bucket: BreakdownBucket; label: string }[] = [
  { bucket: 'passed_first_try', label: 'First try' },
  { bucket: 'passed_after_one_fail', label: 'One retry' },
  { bucket: 'passed_after_many_fails', label: '2+ retries' },
  { bucket: 'still_failed', label: 'Abandoned' },
];

/** The compact row's text (ADR 029): only the deck's primary field, name and value —
 * never prompt/answer content. Falls back to CardSummaryRow.tsx's existing "Untitled
 * card" copy when the primary field itself is blank, so a blank card reads the same
 * way here as it does in the card list. */
function cardTitle(card: BreakdownCard): string {
  return card.primary_field.value
    ? `${card.primary_field.name}: ${card.primary_field.value}`
    : 'Untitled card';
}

export default function SessionBreakdown({ breakdown }: SessionBreakdownProps) {
  const [activeBucket, setActiveBucket] = useState<BreakdownBucket>(
    () => TABS.find((tab) => breakdown[tab.bucket] > 0)?.bucket ?? 'passed_first_try',
  );
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  // One shared trigger ref, reassigned to whichever row was tapped most recently, so
  // BottomSheet's onCloseAutoFocus returns focus to that exact row (mirrors
  // FieldAssignmentBoard's identical need).
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();

  const cards = breakdown.cards.filter((card) => card.bucket === activeBucket);
  const selectedCard = breakdown.cards.find((card) => card.card_id === selectedCardId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-(--color-text-muted)">
        {breakdown.total_cards} card{breakdown.total_cards === 1 ? '' : 's'} practiced
      </p>

      <div
        role="tablist"
        aria-label="Outcome"
        // Four labeled, counted tabs routinely overflow a phone-width viewport (unlike
        // the shorter status tabs elsewhere), so this row scrolls horizontally on its
        // own rather than letting an overflowing tab drag the whole page sideways.
        className="flex gap-4 overflow-x-auto border-b border-(--color-surface-elevated)"
      >
        {TABS.map((tab) => (
          <button
            key={tab.bucket}
            type="button"
            role="tab"
            aria-selected={activeBucket === tab.bucket}
            onClick={() => setActiveBucket(tab.bucket)}
            className={`h-11 whitespace-nowrap border-b-2 px-1 text-sm font-medium ${
              activeBucket === tab.bucket
                ? 'border-(--color-primary) text-(--color-text)'
                : 'border-transparent text-(--color-text-muted)'
            }`}
          >
            {tab.label} ({breakdown[tab.bucket]})
          </button>
        ))}
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-(--color-text-muted)">No cards in this bucket.</p>
      ) : (
        <ul className="flex flex-col">
          {cards.map((card) => (
            <li key={card.card_id}>
              <button
                type="button"
                onClick={(event) => {
                  triggerRef.current = event.currentTarget;
                  setSelectedCardId(card.card_id);
                }}
                className="flex min-h-16 w-full items-center gap-3 py-[14px] text-left"
              >
                <span className="min-w-0 flex-1 truncate text-[15px] leading-5 text-(--color-text)">
                  {cardTitle(card)}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-(--color-text-muted)"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <BottomSheet
        open={selectedCard !== null}
        onClose={() => setSelectedCardId(null)}
        triggerRef={triggerRef}
        ariaLabelledBy={titleId}
      >
        {selectedCard && (
          <>
            <h2 id={titleId} className="text-base font-semibold text-(--color-text)">
              {cardTitle(selectedCard)}
            </h2>
            <div className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto">
              {selectedCard.attempts.map((attempt, index) => (
                <div key={attempt.practice_card_id} className="flex flex-col gap-3">
                  {selectedCard.attempts.length > 1 && (
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
                      Attempt {index + 1} of {selectedCard.attempts.length} ·{' '}
                      {attempt.status === 'passed' ? 'Passed' : 'Failed'}
                    </h3>
                  )}
                  <div className="flex flex-col gap-2">
                    {attempt.prompts.map((field) => (
                      <FieldValue key={field.field_def_id} field={field} labeled />
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    {attempt.answers.map((field) => (
                      <div
                        key={field.field_def_id}
                        className="flex items-start justify-between gap-3"
                      >
                        <FieldValue field={field} labeled />
                        <div className="mt-4 shrink-0">
                          <RatingBadge rating={field.rating} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </BottomSheet>
    </div>
  );
}

/** A read-only rendering of one answer's rating, drawing its label/color from the same
 * tier ramp (MD-2) `RatingChip` uses — this is history, so unlike `RatingChip` it never
 * opens anything on tap. `rating: null` only happens for an orphaned `review_log` row
 * (see `RatedFieldValue`'s docstring). */
function RatingBadge({ rating }: { rating: number | null }) {
  const tier = RATING_TIERS.find((t) => t.rating === rating);
  if (!tier) {
    return (
      <span className="inline-flex h-7 shrink-0 items-center rounded-full border border-(--color-text-muted) px-2 text-xs text-(--color-text-muted)">
        Unrated
      </span>
    );
  }
  return (
    <span
      className={`inline-flex h-7 shrink-0 items-center rounded-full px-2 text-xs font-medium ${tier.chipClass}`}
    >
      {tier.label}
    </span>
  );
}
