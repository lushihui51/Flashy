import { useId, useState, type ReactNode, type RefObject } from 'react';
import { Plus } from 'lucide-react';
import { PICKER_MAX_ITEMS } from 'src/lib/pickerConfig';

export type PickerItem = { id: string; name: string };

type PickerComboboxProps<T extends PickerItem> = {
  /** Already in server order (D13: recency) — this component never sorts. */
  items: T[];
  selected: T | null;
  onSelect: (item: T) => void;
  /** The always-present, always-last create row (Phase 5.5 §2) — this component
   * doesn't know or care what selecting it does (open an overlay, navigate away). */
  onSelectCreate: () => void;
  createLabel: string;
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

/** The one combobox in the app (Phase 5.5 §2), used directly by every caller:
 * open-on-focus-or-click, filter, cap at PICKER_MAX_ITEMS with a "Showing X of Y"
 * footer when there's more, and an always-present create row. What "create" actually
 * *does* — and how items are fetched — is left to the two thin wrappers, since those
 * differ completely (an inline overlay vs. a full navigation round-trip; readSubjects
 * vs. readDecks). */
export default function PickerCombobox<T extends PickerItem>({
  items,
  selected,
  onSelect,
  onSelectCreate,
  createLabel,
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
  // result — the query text still reads as the previously selected name until the
  // user actually types something different, at which point real filtering kicks in.
  const hasEditedSinceSelection = query !== (selected?.name ?? '');
  const matches = hasEditedSinceSelection
    ? items.filter((i) => i.name.toLowerCase().includes(trimmed.toLowerCase()))
    : items;
  const shown = matches.slice(0, PICKER_MAX_ITEMS);
  const hasMore = matches.length > shown.length;

  // The create row participates in the same highlighted-index cycle as real items —
  // it's always the last navigable stop, one past the shown items.
  const navigableCount = shown.length + 1;

  const selectItem = (item: T) => {
    onSelect(item);
    setQuery(item.name);
    setOpen(false);
  };

  const chooseIndex = (index: number) => {
    if (index === shown.length) {
      setOpen(false);
      onSelectCreate();
      return;
    }
    const item = shown[index];
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
      <span className="inline-flex items-center gap-2 rounded-full bg-(--color-surface-elevated) px-3 py-2 text-sm text-(--color-text)">
        {selected && renderLeading?.(selected)}
        {selected?.name ?? ''}
      </span>
    );
  }

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
        className="h-11 w-full rounded-lg border border-(--color-surface-elevated) px-3 text-(--color-text)"
      />
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 w-full rounded-lg border border-(--color-surface-elevated) bg-(--color-surface) py-1 shadow-lg"
        >
          {shown.map((item, index) => (
            // The handler lives on the li itself (the element `getByRole('option')`
            // resolves to), not a nested button — nesting it would put the handler
            // outside the click's dispatch path when the li is the direct target.
            // onMouseDown (not onClick) fires before the input's onBlur closes the
            // list, so the click still lands on the option.
            <li
              key={item.id}
              role="option"
              aria-selected={index === highlighted}
              onMouseDown={(e) => {
                e.preventDefault();
                chooseIndex(index);
              }}
              className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm ${
                index === highlighted ? 'bg-(--color-surface-elevated)' : ''
              }`}
            >
              {renderLeading?.(item)}
              <span className="truncate">{item.name}</span>
            </li>
          ))}
          {hasMore && (
            <li
              aria-hidden="true"
              className="px-3 py-2 text-xs text-(--color-text-muted)"
            >
              Showing {shown.length} of {matches.length} · type to narrow
            </li>
          )}
          <li
            role="option"
            aria-selected={highlighted === shown.length}
            onMouseDown={(e) => {
              e.preventDefault();
              chooseIndex(shown.length);
            }}
            className={`flex w-full cursor-pointer items-center gap-2 border-t border-(--color-surface-elevated) px-3 py-2 text-left text-sm font-medium text-(--color-primary) ${
              highlighted === shown.length ? 'bg-(--color-surface-elevated)' : ''
            }`}
          >
            <Plus aria-hidden="true" className="h-4 w-4 shrink-0" />
            {createLabel}
          </li>
        </ul>
      )}
    </div>
  );
}
