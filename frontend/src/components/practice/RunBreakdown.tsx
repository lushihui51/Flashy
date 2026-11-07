import { useId, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Pencil } from 'lucide-react';
import { startChosenCards } from 'src/api/practice_run';
import FieldValue from 'src/components/practice/FieldValue';
import { RATING_TIERS } from 'src/components/practice/ratingTiers';
import BottomSheet from 'src/components/ui/BottomSheet';
import ChangeBadge from 'src/components/ui/ChangeBadge';
import KeyButton from 'src/components/ui/KeyButton';
import MasteryCircle from 'src/components/ui/MasteryCircle';
import PromptMark from 'src/components/ui/PromptMark';
import RatingMark from 'src/components/ui/RatingMark';
import type { components } from 'src/api/types';
import { CHANGE_KINDS, CHANGE_WORDS, type ChangeKind } from 'src/lib/changeKinds';
import { formatDateTime } from 'src/lib/datetime';
import { failureSentence } from 'src/lib/failureSentence';
import { returnAddressParams } from 'src/lib/returnTo';
import { useViewParams } from 'src/lib/viewParams';

type PracticeRunBreakdown = components['schemas']['PracticeRunBreakdown'];
type BreakdownCard = components['schemas']['BreakdownCard'];
type BreakdownAttempt = components['schemas']['BreakdownAttempt'];
type FieldReadinessDelta = components['schemas']['FieldReadinessDelta'];
type ResolvedFieldValue = components['schemas']['ResolvedFieldValue'];

type OrderKey = 'mastery' | 'gains' | 'drops';

const ORDER_OPTIONS: { key: OrderKey; label: string }[] = [
  { key: 'mastery', label: 'Mastery' },
  { key: 'gains', label: 'Gains' },
  { key: 'drops', label: 'Drops' },
];

const BLOCK_CLASS = 'tappable-sm bg-(--color-surface) text-(--color-ink)';
const BLOCK_PRESSED_CLASS = 'tappable-sm tappable-pressed bg-(--color-ink) text-(--color-surface)';
const SIDE_HEADING_CLASS = 'ruled-bottom pt-2.5 pb-2 text-sm font-semibold';
const NOT_ASKED = 'not asked';

function readOrder(params: URLSearchParams): OrderKey {
  const order = params.get('order');
  return order === 'gains' || order === 'drops' ? order : 'mastery';
}

function orderCards(cards: BreakdownCard[], order: OrderKey): BreakdownCard[] {
  const sorted = [...cards];
  if (order === 'gains') sorted.sort((a, b) => b.delta - a.delta);
  else if (order === 'drops') sorted.sort((a, b) => a.delta - b.delta);
  else sorted.sort((a, b) => a.readiness - b.readiness);
  return sorted;
}

/** The card's name in its row: the value of its deck's first field alone, or "Untitled card"
 * when that value is blank. */
function cardTitle(card: BreakdownCard): string {
  return card.primary_field.value || 'Untitled card';
}

function ratingWord(rating: number | null): string {
  return RATING_TIERS.find((tier) => tier.rating === rating)?.label ?? NOT_ASKED;
}

/** The field's value as the attempts carry it, or undefined when no attempt names the field. */
function fieldValue(card: BreakdownCard, field: FieldReadinessDelta): ResolvedFieldValue | undefined {
  for (const attempt of card.attempts) {
    const named = [...attempt.prompts, ...attempt.answers].find(
      (value) => value.field_def_id === field.field_def_id,
    );
    if (named) return named;
  }
  return undefined;
}

function SheetField({
  field,
  value,
  attempts,
}: {
  field: FieldReadinessDelta;
  value: ResolvedFieldValue;
  attempts: BreakdownAttempt[];
}) {
  const named = (candidate: ResolvedFieldValue) => candidate.field_def_id === field.field_def_id;
  const marks = attempts.map((attempt) => {
    if (field.side === 'prompt') {
      const shown = attempt.prompts.some(named);
      return {
        id: attempt.practice_card_id,
        word: shown ? 'shown' : 'not shown',
        mark: <PromptMark shown={shown} />,
      };
    }
    const rating = attempt.answers.find(named)?.rating ?? null;
    return {
      id: attempt.practice_card_id,
      word: ratingWord(rating),
      mark: <RatingMark rating={rating} />,
    };
  });

  return (
    <div className="flex flex-col gap-1 pt-2.5 pb-3">
      <div className="flex items-center gap-2.5">
        <span className="min-w-0 flex-1 text-label text-(--color-aside)">{field.name}</span>
        <span
          role="img"
          aria-label={`${field.name}: ${marks.map((mark) => mark.word).join(', then ')}`}
          className="flex flex-none items-center gap-1"
        >
          {marks.map((mark) => (
            <span key={mark.id} className="flex w-[0.8125rem] justify-center">
              {mark.mark}
            </span>
          ))}
        </span>
        <span aria-hidden="true" className="w-1" />
        <MasteryCircle readiness={field.readiness} size="row" change={field.change} />
      </div>
      <FieldValue field={value} labeled={false} />
    </div>
  );
}

function KeyEntry({ mark, word }: { mark: ReactNode; word: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {mark}
      <span>{word}</span>
    </span>
  );
}

function MarksKey() {
  return (
    <div
      role="dialog"
      aria-label="Key"
      className="tappable absolute top-3.5 left-3 z-2 flex w-60 flex-col gap-2 rounded-2xl bg-(--color-surface) px-3.5 py-3 text-label text-(--color-ink)"
    >
      <div className="font-semibold">Prompt</div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5">
        <KeyEntry mark={<PromptMark shown />} word="shown" />
        <KeyEntry mark={<PromptMark shown={false} />} word="not shown" />
      </div>
      <div className="mt-1 font-semibold">Answer</div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5">
        {RATING_TIERS.map((tier) => (
          <KeyEntry key={tier.rating} mark={<RatingMark rating={tier.rating} />} word={tier.label} />
        ))}
        <KeyEntry mark={<RatingMark rating={null} />} word={NOT_ASKED} />
      </div>
    </div>
  );
}

function CardSheetContent({
  card,
  titleId,
  onEdit,
}: {
  card: BreakdownCard;
  titleId: string;
  onEdit: () => void;
}) {
  const [keyOpen, setKeyOpen] = useState(false);

  const shownFields = card.fields.flatMap((field) => {
    const value = fieldValue(card, field);
    return value ? [{ field, value }] : [];
  });
  const fieldsOf = (side: FieldReadinessDelta['side']) => (
    <div className="divide-y divide-(--color-line)">
      {shownFields
        .filter(({ field }) => field.side === side)
        .map(({ field, value }) => (
          <SheetField
            key={field.field_def_id}
            field={field}
            value={value}
            attempts={card.attempts}
          />
        ))}
    </div>
  );

  return (
    <>
      {/* The sheet's panel is the stacking context, so the "i" and the key, inside the scrolling
          area, still rise above this layer. */}
      {keyOpen && (
        <div
          aria-hidden="true"
          data-testid="key-layer"
          onClick={() => setKeyOpen(false)}
          className="absolute inset-0 z-1 rounded-t-block bg-(--color-ink)/35"
        />
      )}
      <div className="flex items-center gap-3">
        <h2 id={titleId} className="min-w-0 flex-1 text-2xl font-bold break-words text-(--color-ink)">
          {cardTitle(card)}
        </h2>
        <MasteryCircle readiness={card.readiness} size="sheet" change={card.change} />
      </div>
      {/* Padded out to the sheet's edge, or scrolling would clip the "i" off the card's corner. */}
      <div className="-mx-4 -mt-3.25 max-h-[65vh] overflow-y-auto px-4 pt-3.25">
        <div className="outlined-ink relative rounded-block bg-(--color-surface) px-4 text-(--color-ink)">
          <span className="absolute -top-3.25 -left-3.25 z-3 block rounded-[0.9375rem] bg-(--color-surface) p-0.5">
            <KeyButton open={keyOpen} onClick={() => setKeyOpen((open) => !open)} />
          </span>
          {keyOpen && <MarksKey />}
          <h3 className={SIDE_HEADING_CLASS}>Prompt</h3>
          {fieldsOf('prompt')}
          <h3 className={`${SIDE_HEADING_CLASS} border-t border-(--color-line)`}>Answer</h3>
          {fieldsOf('answer')}
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="tappable-sm flex h-10 shrink-0 items-center gap-1.5 self-start rounded-full bg-(--color-surface) px-3.5 text-body font-semibold text-(--color-ink)"
      >
        <Pencil aria-hidden="true" className="size-4" />
        Edit card
      </button>
    </>
  );
}

/** A completed practice's summary: how many cards had each kind of change, the way to start a
 * practice of the listed cards once a kind is chosen, the list narrowed to the kinds chosen and
 * ordered by mastery, gains or drops, one row per card, and the sheet of the card a row opens.
 * The chosen kinds, the order and the open card are the page's `kind`, `order` and `card` URL
 * params, so the page must render it under a router and keep those params. The sheet's "Edit
 * card" opens the card's form, which returns to the page's full address. A practice started
 * here opens its own page. */
export default function RunBreakdown({
  breakdown,
  practiceSessionId,
}: {
  breakdown: PracticeRunBreakdown;
  practiceSessionId: string;
}): ReactNode {
  const { params, setParams, changeView } = useViewParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const titleId = useId();
  const rowRef = useRef<HTMLButtonElement | null>(null);
  const countsRef = useRef<HTMLDivElement>(null);
  const orderRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const requested = params.getAll('kind');
  const chosen = CHANGE_KINDS.filter((kind) => requested.includes(kind));
  const order = readOrder(params);

  const narrowed =
    chosen.length === 0
      ? breakdown.cards
      : breakdown.cards.filter((card) => chosen.includes(card.change));
  const cards = orderCards(narrowed, order);
  const openCard = breakdown.cards.find((card) => card.card_id === params.get('card'));

  const practiceThese = useMutation({
    mutationFn: () =>
      startChosenCards(practiceSessionId, {
        name: formatDateTime(new Date()),
        card_ids: cards.map((card) => card.card_id),
      }),
    onSuccess: async (newSession) => {
      await queryClient.invalidateQueries({ queryKey: ['practice_runs'] });
      navigate(`/practice/${newSession.id}`);
    },
  });

  const toggleKind = (kind: ChangeKind) => {
    practiceThese.reset();
    const next = new URLSearchParams(params);
    next.delete('kind');
    for (const other of CHANGE_KINDS) {
      if (chosen.includes(other) !== (other === kind)) next.append('kind', other);
    }
    changeView(next, { control: () => countsRef.current, listStart: () => listRef.current });
  };

  const chooseOrder = (key: OrderKey) => {
    const next = new URLSearchParams(params);
    if (key === 'mastery') next.delete('order');
    else next.set('order', key);
    changeView(next, { control: () => orderRef.current, listStart: () => listRef.current });
  };

  const open = (cardId: string, row: HTMLButtonElement) => {
    rowRef.current = row;
    const next = new URLSearchParams(params);
    next.set('card', cardId);
    setParams(next);
  };

  const close = () => {
    const next = new URLSearchParams(params);
    next.delete('card');
    setParams(next);
  };

  const editCard = (cardId: string) => {
    navigate({
      pathname: `/cards/${cardId}/edit`,
      search: returnAddressParams(location, 'cancelTo', 'returnTo').toString(),
    });
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div ref={countsRef} role="group" className="flex gap-1.5 pb-0.5">
        {CHANGE_KINDS.map((kind) => {
          const pressed = chosen.includes(kind);
          const count = breakdown.cards.filter((card) => card.change === kind).length;
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={pressed}
              aria-label={`${count} ${CHANGE_WORDS[kind]}`}
              onClick={() => toggleKind(kind)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-field py-2 ${
                pressed ? BLOCK_PRESSED_CLASS : BLOCK_CLASS
              }`}
            >
              <ChangeBadge kind={kind} />
              <span className="text-base font-bold">{count}</span>
            </button>
          );
        })}
      </div>

      {chosen.length > 0 && cards.length > 0 && (
        <button
          type="button"
          disabled={practiceThese.isPending}
          onClick={() => practiceThese.mutate()}
          className="tappable -mt-1 h-action w-full shrink-0 rounded-2xl bg-(--color-main-action) text-action font-semibold text-(--color-ink)"
        >
          Practice these
        </button>
      )}
      {practiceThese.isError && (
        <p role="alert" className="-mt-1.5 text-sm leading-[1.35] font-medium text-(--color-wrong)">
          {failureSentence(practiceThese.error, 'Practice not found.')}
        </p>
      )}

      <div ref={orderRef} role="radiogroup" aria-label="Order by" className="flex items-center gap-2">
        <span className="mr-0.5 text-body font-medium text-(--color-aside)">Order by:</span>
        {ORDER_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={order === option.key}
            onClick={() => chooseOrder(option.key)}
            className={`h-9.5 rounded-full px-4 text-sm font-semibold ${
              order === option.key ? BLOCK_PRESSED_CLASS : BLOCK_CLASS
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Drawn with no block when empty, so a list narrowed to nothing shows nothing, while a
          reveal still finds where the list starts. */}
      <ul
        ref={listRef}
        className={
          cards.length > 0
            ? 'tappable divide-y divide-(--color-line) overflow-hidden rounded-block bg-(--color-surface)'
            : undefined
        }
      >
        {cards.map((card) => (
          <li key={card.card_id}>
            <button
              type="button"
              onClick={(event) => open(card.card_id, event.currentTarget)}
              className="flex w-full items-center gap-3 py-2.75 pr-3 pl-4 text-left text-(--color-ink)"
            >
              <span className="min-w-0 flex-1 text-base font-semibold break-words">
                {cardTitle(card)}
              </span>
              <MasteryCircle readiness={card.readiness} size="summary" change={card.change} />
              <ChevronRight
                aria-hidden="true"
                strokeWidth={2.2}
                className="size-icon shrink-0 text-(--color-aside)"
              />
            </button>
          </li>
        ))}
      </ul>

      <BottomSheet
        open={openCard !== undefined}
        onClose={close}
        triggerRef={rowRef}
        ariaLabelledBy={titleId}
      >
        {openCard && (
          <CardSheetContent
            card={openCard}
            titleId={titleId}
            onEdit={() => editCard(openCard.card_id)}
          />
        )}
      </BottomSheet>
    </div>
  );
}
