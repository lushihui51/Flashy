import { Link } from 'react-router-dom';
import type { components } from 'src/api/types';

type CardListProps = {
  deckName: string;
  /** Sorted by position. The first one leads each card. */
  fieldDefs: components['schemas']['DeckFieldDefRead'][];
  cards: components['schemas']['CardRead'][];
  /** Where tapping a card goes: the card's edit route. */
  cardHref: (cardId: string) => string;
};

// About what fits half a phone-width card at `text-body`; a longer value takes the whole width
// so it does not wrap into a narrow column.
const HALF_WIDTH_CHARACTERS = 18;

function FieldValueText({ value }: { value: string }) {
  return value === '' ? <span className="font-normal italic text-(--color-aside)">empty</span> : value;
}

/** A deck's cards, one block per card, each block a single link to `cardHref`. Every field
 * of `fieldDefs` reads as its label over the card's value, the first one largest. */
export default function CardList({ deckName, fieldDefs, cards, cardHref }: CardListProps) {
  const [leadField, ...otherFields] = fieldDefs;

  return (
    <ul aria-label={`Cards in ${deckName}`} className="flex flex-col gap-3">
      {cards.map((card) => (
        <li key={card.id}>
          <Link
            to={cardHref(card.id)}
            className="tappable flex flex-col rounded-block bg-(--color-surface) px-4 text-(--color-ink)"
          >
            {leadField && (
              <span className="flex flex-col gap-px py-3">
                <span className="text-label text-(--color-aside)">{leadField.name}</span>
                <span className="text-value leading-[1.1] font-bold tracking-[-0.01em] break-words">
                  <FieldValueText value={card.values[leadField.id] ?? ''} />
                </span>
              </span>
            )}
            {otherFields.length > 0 && (
              <span className="grid grid-cols-2 gap-x-4 gap-y-2.5 ruled-top pt-3 pb-3.5">
                {otherFields.map((fieldDef) => {
                  const value = card.values[fieldDef.id] ?? '';
                  return (
                    <span
                      key={fieldDef.id}
                      className={`flex min-w-0 flex-col gap-0.5 ${
                        value.length > HALF_WIDTH_CHARACTERS ? 'col-span-2' : ''
                      }`}
                    >
                      <span className="text-label text-(--color-aside)">{fieldDef.name}</span>
                      <span className="text-body leading-[1.35] font-medium break-words">
                        <FieldValueText value={value} />
                      </span>
                    </span>
                  );
                })}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
