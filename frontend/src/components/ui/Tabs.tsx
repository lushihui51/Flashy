import type { ReactNode } from 'react';

export type TabItem<T extends string> = { value: T; label: string };

type TabsProps<T extends string> = {
  ariaLabel: string;
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** A row of tabs drawn as pills, the one whose value is `value` pressed in. The caller
 * holds `value` and renders what each tab shows. */
export default function Tabs<T extends string>({
  ariaLabel,
  items,
  value,
  onChange,
}: TabsProps<T>): ReactNode {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex gap-2 pb-0.5">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={item.value === value}
          onClick={() => onChange(item.value)}
          className={`tappable-sm h-tab rounded-full px-4 text-sm font-semibold ${
            item.value === value
              ? 'tappable-pressed bg-(--color-ink) text-(--color-surface)'
              : 'bg-(--color-surface) text-(--color-ink)'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
