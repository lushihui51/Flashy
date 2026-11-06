import { useRef, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import ChangeBadge from 'src/components/ui/ChangeBadge';
import MasteryCircle from 'src/components/ui/MasteryCircle';
import type { components } from 'src/api/types';
import { CHANGE_KINDS, CHANGE_WORDS, type ChangeKind } from 'src/lib/changeKinds';
import { useViewParams } from 'src/lib/viewParams';

type PracticeRunBreakdown = components['schemas']['PracticeRunBreakdown'];
type BreakdownCard = components['schemas']['BreakdownCard'];

type OrderKey = 'mastery' | 'gains' | 'drops';

const ORDER_OPTIONS: { key: OrderKey; label: string }[] = [
  { key: 'mastery', label: 'Mastery' },
  { key: 'gains', label: 'Gains' },
  { key: 'drops', label: 'Drops' },
];

const BLOCK_CLASS = 'tappable-sm bg-(--color-surface) text-(--color-ink)';
const BLOCK_PRESSED_CLASS = 'tappable-sm tappable-pressed bg-(--color-ink) text-(--color-surface)';

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

/** A completed practice's summary: how many cards had each kind of change, the list narrowed to
 * the kinds chosen and ordered by mastery, gains or drops, and one row per card. The chosen kinds
 * and the order are the page's `kind` and `order` URL params, so the page must render it under a
 * router and keep those params. */
export default function RunBreakdown({ breakdown }: { breakdown: PracticeRunBreakdown }): ReactNode {
  const { params, changeView } = useViewParams();
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

  const toggleKind = (kind: ChangeKind) => {
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
    </div>
  );
}
