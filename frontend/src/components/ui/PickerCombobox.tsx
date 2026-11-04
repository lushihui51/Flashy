import { useId, useState, type ReactNode, type RefObject } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { PICKER_MAX_ITEMS } from 'src/lib/pickerConfig';

export type PickerItem = { id: string; name: string };

/** Choosing a value to *keep* (a form field) versus choosing one to *narrow by* (a
 * filter) differ in exactly one place: the extra row the list always carries. Picking
 * one of these decides which row that is, and makes the other variant's props a type
 * error — a filter can't accidentally offer "New subject…", and a form field can't
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
      /** The always-present, always-**first** row, e.g. "All subjects" — the way back to
       * no filter at all. First, not last, because it is where the eye starts when the
       * question is "which of these am I narrowing to?". */
      clearLabel: string;
      onClear: () => void;
      onSelectCreate?: never;
      createLabel?: never;
    };

type PickerComboboxProps<T extends PickerItem> = PurposeProps & {
  /** Already in the server's recency order — this component never sorts. */
  items: T[];
  selected: T | null;
  onSelect: (item: T) => void;
  placeholder: string;
  /** Static chip, no combobox — edit mode only (a card can't move between decks). */
  locked?: boolean;
  renderLeading?: (item: T) => ReactNode;
  disabled?: boolean;
  /** So a caller opening an overlay from the create row (DeckEditor) can pass this
   * straight through as FullScreenDialog's triggerRef, returning focus to the actual
   * input on close rather than to nothing in particular. */
  inputRef?: RefObject<HTMLInputElement | null>;
};

/** The one combobox in the app, used directly by every caller: open-on-focus-or-click,
 * filter, cap at PICKER_MAX_ITEMS with a "Showing X of Y" footer when there's more, and
 * one always-present action row — "New X…" when picking a value, "All X" when narrowing
 * by one (see PurposeProps). What that row *does*, and how the items were fetched,
 * belong to the caller: nothing here reaches for data. */
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
  disabled,
  inputRef,
}: PickerComboboxProps<T>) {
  const listboxId = useId();

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

  const actionRow = (
    <li
      role="option"
      aria-selected={highlighted === actionIndex}
      onMouseDown={(e) => {
        e.preventDefault();
        chooseIndex(actionIndex);
      }}
      className={`flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-[15px] font-semibold text-(--color-ink) ${
        highlighted === actionIndex ? 'bg-(--color-ground)' : ''
      }`}
    >
      {filtering ? (
        <X aria-hidden="true" className="h-4 w-4 shrink-0" />
      ) : (
        <Plus aria-hidden="true" className="h-4 w-4 shrink-0" />
      )}
      {filtering ? clearLabel : createLabel}
    </li>
  );

  return (
    <div className="relative">
      <input
        ref={inputRef}
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
        // A click on an *already*-focused input fires no new focus event (selecting
        // an option deliberately keeps focus in place, see onMouseDown below) —
        // onClick is what actually reopens the list in that case.
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`h-[46px] w-full rounded-[14px] border-[1.5px] border-(--color-line) bg-(--color-surface) text-base text-(--color-ink) placeholder:text-(--color-aside) ${
          filtering ? 'pr-9 pl-3.5' : 'px-3.5'
        }`}
      />
      {filtering && (
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-[15px] right-3.5 h-4 w-4 text-(--color-ink)"
        />
      )}
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="tappable absolute z-10 mt-1 w-full divide-y divide-(--color-line) overflow-hidden rounded-[14px] bg-(--color-surface)"
        >
          {/* The action row: first when it clears a filter, last when it creates. Same
              markup either way, so both are one keyboard cycle and one click path. */}
          {filtering && actionRow}
          {shown.map((item, index) => (
            // The handler lives on the li itself (the element `getByRole('option')`
            // resolves to), not a nested button — nesting it would put the handler
            // outside the click's dispatch path when the li is the direct target.
            // onMouseDown (not onClick) fires before the input's onBlur closes the
            // list, so the click still lands on the option.
            <li
              key={item.id}
              role="option"
              aria-selected={index + firstItemIndex === highlighted}
              onMouseDown={(e) => {
                e.preventDefault();
                chooseIndex(index + firstItemIndex);
              }}
              className={`flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-[15px] text-(--color-ink) ${
                index + firstItemIndex === highlighted ? 'bg-(--color-ground)' : ''
              }`}
            >
              {renderLeading?.(item)}
              <span className="truncate">{item.name}</span>
            </li>
          ))}
          {hasMore && (
            <li
              aria-hidden="true"
              className="px-3 py-2 text-xs text-(--color-aside)"
            >
              Showing {shown.length} of {matches.length} · type to narrow
            </li>
          )}
          {!filtering && actionRow}
        </ul>
      )}
    </div>
  );
}
