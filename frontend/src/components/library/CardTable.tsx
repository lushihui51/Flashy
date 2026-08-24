import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { components } from 'src/api/types';

type CardTableProps = {
  deckName: string;
  /** Sorted by position — already active-only, per the backend's D11 (archived
   * fields never appear in DeckDetail.field_defs at all). */
  fieldDefs: components['schemas']['DeckFieldDefRead'][];
  cards: components['schemas']['CardRead'][];
  /** Where tapping a row goes — a card-edit route, currently a placeholder. */
  cardHref: (cardId: string) => string;
};

/** Deck detail's card table (Phase 2.5): rows are cards, columns are fields — the
 * first column frozen while the rest scrolls horizontally. Doesn't fetch, takes
 * everything as props. */
export default function CardTable({ deckName, fieldDefs, cards, cardHref }: CardTableProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setIsScrollable(el.scrollWidth > el.clientWidth);
    check();
    // jsdom (tests) has no ResizeObserver and no real layout — the one check above
    // already leaves isScrollable false there, which is correct for that environment.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fieldDefs.length, cards.length]);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        tabIndex={0}
        aria-label={`Cards in ${deckName}`}
        className="overflow-x-auto"
      >
        <table className="border-collapse">
          <thead>
            <tr>
              {fieldDefs.map((fieldDef, i) => (
                <th
                  key={fieldDef.id}
                  scope="col"
                  className={`min-w-[120px] border-b border-(--color-surface-elevated) px-3 py-2 text-left text-[12px] font-normal text-(--color-text-muted) ${
                    i === 0 ? 'sticky left-0 z-10 bg-(--color-surface)' : ''
                  }`}
                >
                  {fieldDef.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => (
              <tr
                key={card.id}
                onClick={() => navigate(cardHref(card.id))}
                className="cursor-pointer hover:bg-(--color-surface-elevated) active:bg-(--color-surface-elevated)"
              >
                {fieldDefs.map((fieldDef, i) => {
                  const value = card.values[fieldDef.id] ?? '';
                  const content = value === '' ? (
                    <span className="italic text-(--color-text-muted)">empty</span>
                  ) : (
                    value
                  );
                  return (
                    <td
                      key={fieldDef.id}
                      className={`min-w-[120px] border-b border-(--color-surface-elevated) px-3 py-2 text-(--color-text) ${
                        i === 0 ? 'sticky left-0 z-10 bg-(--color-surface)' : ''
                      }`}
                    >
                      {i === 0 ? (
                        <Link
                          to={cardHref(card.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="block"
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isScrollable && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-(--color-surface) to-transparent"
        />
      )}
    </div>
  );
}
