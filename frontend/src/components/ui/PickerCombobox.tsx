import { useId, useRef, useState, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import Scrim from 'src/components/ui/Scrim';
import { PICKER_MAX_ITEMS } from 'src/lib/pickerConfig';

export type PickerItem = { id: string; name: string };

/** Choosing a value to *keep* (a form field) versus choosing one to *narrow by* (a
 * filter) differ in exactly one place: the extra row the list always carries. Picking
 * one of these decides which row that is, and makes the other variant's props a type
 * error — a filter can't accidentally offer "New deck…", and a form field can't
 * offer a clear row that would leave it empty. */
type PurposeProps =
  | {
      purpose?: 'create';
      /** The always-present, always-last create row — this component doesn't know or
       * care what selecting it does (open an overlay, navigate away). */
      onSelectCreate: () => void;
      createLabel: string;
      clearLabel?: never;
      onClear?: never;
    }
  | {
      purpose: 'filter';
      /** The always-present, always-**first** row, e.g. "All decks" — the way back to
       * no filter at all. First, not last, because it is where the eye starts when the
       * question is "which of these am I narrowing to?". */
      clearLabel: string;
      onClear: () => void;
      onSelectCreate?: never;
      createLabel?: never;
    };

export type PickerComboboxProps<T extends PickerItem> = PurposeProps & {
  /** Already in the server's recency order — this component never sorts. */
  items: T[];
  selected: T | null;
  onSelect: (item: T) => void;
  placeholder: string;
  /** Static chip, no combobox — edit mode only (a card can't move between decks). */
  locked?: boolean;
  renderLeading?: (item: T) => ReactNode;
  /** Drawn under the item's name on its row in the list, and nowhere else. */
  renderBeneath?: (item: T) => ReactNode;
  disabled?: boolean;
};

/** The one combobox in the app, under `DeckPicker` for a list of decks: open-on-focus-or-click,
 * filter, cap at PICKER_MAX_ITEMS with a "Showing X of Y" footer when there's more, and
 * one always-present action row — "New X…" when picking a value, "All X" when narrowing
 * by one (see PurposeProps). What that row *does*, and how the items were fetched,
 * belong to the caller: nothing here reaches for data.
 *
 * While the list is open it is a panel pointing at the input, the rest of the screen is
 * dimmed, the page cannot scroll, and a tap on the dimming closes the list and acts on
 * nothing beneath it. */
export default function PickerCombobox<T extends PickerItem>({
  items,
  selected,
  onSelect,
  purpose = 'create',
  onSelectCreate,
  createLabel,
  clearLabel,
  onClear,
  placeholder,
  locked,
  renderLeading,
  renderBeneath,
  disabled,
}: PickerComboboxProps<T>) {
  const listboxId = useId();
  const controlRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(selected?.name ?? '');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  // Adjusted during render, not in an effect — see React's docs on "adjusting state
  // when a prop changes." Fires when `selected` changes for any reason: the user
  // picked something, or a caller (e.g. the create-overlay's onSuccess) updated it.
  const [syncedName, setSyncedName] = useState(selected?.name);
  if (!open && selected?.name !== syncedName) {
    setSyncedName(selected?.name);
    setQuery(selected?.name ?? '');
  }

  const trimmed = query.trim();
  // Reopening (click/focus) shows the full capped list, not last time's filtered-down
  // result — the query text still reads as the selected item's name until the user
  // actually types something different, at which point real filtering kicks in.
  const hasEditedSinceSelection = query !== (selected?.name ?? '');
  const matches = hasEditedSinceSelection
    ? items.filter((i) => i.name.toLowerCase().includes(trimmed.toLowerCase()))
    : items;
  const shown = matches.slice(0, PICKER_MAX_ITEMS);
  const hasMore = matches.length > shown.length;

  // The action row participates in the same highlighted-index cycle as real items: one
  // stop before them when it clears, one past them when it creates.
  const filtering = purpose === 'filter';
  const actionIndex = filtering ? 0 : shown.length;
  const firstItemIndex = filtering ? 1 : 0;
  const navigableCount = shown.length + 1;

  const selectItem = (item: T) => {
    onSelect(item);
    setQuery(item.name);
    setOpen(false);
  };

  const chooseIndex = (index: number) => {
    if (index === actionIndex) {
      setOpen(false);
      if (filtering) {
        setQuery('');
        onClear?.();
      } else {
        onSelectCreate?.();
      }
      return;
    }
    const item = shown[index - firstItemIndex];
    if (item) selectItem(item);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlighted((i) => Math.min(i + 1, navigableCount - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      chooseIndex(highlighted);
    }
  };

  if (locked) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-(--color-line) bg-(--color-ground) px-3 py-2 text-sm text-(--color-ink)">
        {selected && renderLeading?.(selected)}
        {selected?.name ?? ''}
      </span>
    );
  }

  const clearChosen = filtering && selected === null;
  const actionRow = (
    <li
      role="option"
      aria-selected={highlighted === actionIndex}
      onMouseEnter={() => setHighlighted(actionIndex)}
      onMouseDown={() => chooseIndex(actionIndex)}
      className={rowClassName(highlighted === actionIndex)}
    >
      <ChosenMark chosen={clearChosen} />
      <span className="min-w-0 truncate">{filtering ? clearLabel : createLabel}</span>
    </li>
  );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div ref={controlRef} className="relative">
          <input
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlighted(0);
            }}
            onFocus={() => setOpen(true)}
            // A click on an *already*-focused input fires no new focus event (a press in the
            // panel or on the dimming deliberately keeps focus in place) — onClick is what
            // actually reopens the list in that case.
            onClick={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`h-field w-full rounded-field bg-(--color-surface) text-base text-(--color-ink) placeholder:text-(--color-aside) ${
              open ? 'outlined-ink' : 'outlined-line'
            } ${filtering || open ? 'pr-9 pl-3.5' : 'px-3.5'}`}
          />
          {open ? (
            <ChevronUp aria-hidden="true" className={chevronClassName(filtering)} />
          ) : (
            filtering && <ChevronDown aria-hidden="true" className={chevronClassName(filtering)} />
          )}
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        {/* One element, since the portal takes a single child; it starts no stacking context,
            so the panel's z-60 stands above the scrim's z-50. */}
        <div>
          <Scrim anchor={controlRef} onDismiss={() => setOpen(false)} />
          <Popover.Content
            // The input keeps focus while the list is open, so this is no dialog of its own.
            role="presentation"
            side="bottom"
            align="start"
            sideOffset={14}
            collisionPadding={16}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              // The input is the panel's own control: pressing or focusing it closes nothing.
              if (controlRef.current?.contains(e.target as Node)) e.preventDefault();
            }}
            // A press anywhere in the panel leaves focus in the input, so the user keeps typing.
            onMouseDown={(e) => e.preventDefault()}
            className="tappable z-60 flex max-h-(--radix-popover-content-available-height) w-65 flex-col rounded-[1.125rem] bg-(--color-surface) p-1.5"
          >
            <Popover.Arrow asChild>
              {/* Radix turns this element to whichever side the panel took, 180° when it opens
                  below, so -135° reads as 45° there with the outline facing the control.
                  Absolute, because Radix adds a measured arrow's height to sideOffset; centred
                  on the panel's edge so its lower half hides the panel's own outline. */}
              <span className="absolute size-3.5 -translate-x-1/2 -translate-y-1/2 -rotate-135 rounded-tl-[0.1875rem] bg-(--color-surface) outlined-pointer" />
            </Popover.Arrow>
            {/* Scrolls inside the panel, since the page beneath is locked and a list on a short
                screen would otherwise leave its last rows out of reach. */}
            <ul id={listboxId} role="listbox" className="min-h-0 overflow-y-auto">
              {/* The action row: first when it clears a filter, last when it creates. Same
                  markup either way, so both are one keyboard cycle and one click path. */}
              {filtering && actionRow}
              {shown.map((item, index) => (
                // The handler lives on the li itself (the element `getByRole('option')`
                // resolves to), not a nested button — nesting it would put the handler
                // outside the click's dispatch path when the li is the direct target.
                <li
                  key={item.id}
                  role="option"
                  aria-selected={index + firstItemIndex === highlighted}
                  onMouseEnter={() => setHighlighted(index + firstItemIndex)}
                  onMouseDown={() => chooseIndex(index + firstItemIndex)}
                  className={rowClassName(index + firstItemIndex === highlighted)}
                >
                  <ChosenMark chosen={selected?.id === item.id} />
                  {renderLeading?.(item)}
                  {renderBeneath ? (
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate">{item.name}</span>
                      {/* Wraps rather than clips: it is what tells two decks of one name apart. */}
                      <span className="mt-0.25 block text-label leading-tight font-normal wrap-break-word text-(--color-aside)">
                        {renderBeneath(item)}
                      </span>
                    </span>
                  ) : (
                    <span className="min-w-0 truncate">{item.name}</span>
                  )}
                </li>
              ))}
              {hasMore && (
                <li aria-hidden="true" className="px-3 py-2 text-xs text-(--color-aside)">
                  Showing {shown.length} of {matches.length} · type to narrow
                </li>
              )}
              {!filtering && shown.length > 0 && (
                <li aria-hidden="true" className="mx-2 my-1 border-t border-(--color-line)" />
              )}
              {!filtering && actionRow}
            </ul>
          </Popover.Content>
        </div>
      </Popover.Portal>
    </Popover.Root>
  );
}

function rowClassName(highlighted: boolean) {
  return `flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-base font-semibold text-(--color-ink) ${
    highlighted ? 'bg-(--color-ground)' : ''
  }`;
}

function chevronClassName(filtering: boolean) {
  return `pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-(--color-ink) ${
    filtering ? 'h-4 w-4' : 'size-icon'
  }`;
}

/** A row's opening mark: a check when `chosen`, otherwise a blank of its width, so every
 * row's words line up. */
function ChosenMark({ chosen }: { chosen: boolean }) {
  return chosen ? (
    <Check aria-hidden="true" strokeWidth={2.4} className="size-icon shrink-0" />
  ) : (
    <span aria-hidden="true" className="size-icon shrink-0" />
  );
}
