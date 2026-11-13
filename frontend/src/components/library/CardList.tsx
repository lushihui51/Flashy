import { Link } from 'react-router-dom';
import MasteryCircle from 'src/components/ui/MasteryCircle';
import type { components } from 'src/api/types';
import { fieldLabel } from 'src/lib/fieldLabel';

type CardListProps = {
  deckName: string;
  /** Sorted by position. The first one leads each card. */
  fieldDefs: components['schemas']['DeckFieldDefRead'][];
  cards: components['schemas']['CardSummary'][];
  /** Where tapping a card goes: the card's edit route. */
  cardHref: (cardId: string) => string;
};

// About what fits half a phone-width card at `text-body`; a longer value takes the whole width
// so it does not wrap into a narrow column. It counts only where the values stand two to a line.
const HALF_WIDTH_CHARACTERS = 18;

function FieldValueText({ value }: { value: string }) {
  return value === '' ? <span className="font-normal italic text-(--color-aside)">empty</span> : value;
}

/** A deck's cards, one block per card, each block a single link to `cardHref`. Every field
 * of `fieldDefs` reads as its label over the card's value, the first one largest, with the
 * card's mastery beside it. The first value is shortened after two lines; every other value
 * shows whole. */
export default function CardList({ deckName, fieldDefs, cards, cardHref }: CardListProps) {
  const [leadField, ...otherFields] = fieldDefs;

  return (
    <ul aria-label={`Cards in ${deckName}`} className="flex flex-col gap-3">
      {cards.map((card) => (
        // The container the other values' columns are sized against.
        <li key={card.id} className="@container">
          <Link
            to={cardHref(card.id)}
            className="tappable flex flex-col rounded-block bg-(--color-surface) px-4 text-(--color-ink)"
          >
            {leadField && (
              <span className="flex items-center gap-2.5 py-3">
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="text-label break-words text-(--color-aside)">
                    {fieldLabel(leadField.name)}
                  </span>
                  {/* The padding, taken back by the margin, is room for a descender beneath the
                      last line, which this tight line height would otherwise lose to the clamp. */}
                  <span className="-mb-[0.075em] line-clamp-2 pb-[0.075em] text-value leading-[1.1] font-bold tracking-[-0.01em] break-words">
                    <FieldValueText value={card.values[leadField.id] ?? ''} />
                  </span>
                </span>
                <MasteryCircle readiness={card.readiness} size="row" />
              </span>
            )}
            {otherFields.length > 0 && (
              // One value to a line on a card too narrow for two columns of words, as at a
              // large text size on a phone.
              <span className="grid grid-cols-1 gap-x-4 gap-y-2.5 ruled-top pt-3 pb-3.5 @min-[16rem]:grid-cols-2">
                {otherFields.map((fieldDef) => {
                  const value = card.values[fieldDef.id] ?? '';
                  return (
                    <span
                      key={fieldDef.id}
                      className={`flex min-w-0 flex-col gap-0.5 ${
                        value.length > HALF_WIDTH_CHARACTERS ? '@min-[16rem]:col-span-2' : ''
                      }`}
                    >
                      <span className="text-label break-words text-(--color-aside)">
                        {fieldLabel(fieldDef.name)}
                      </span>
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
