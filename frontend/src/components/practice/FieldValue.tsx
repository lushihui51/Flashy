import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Image as ImageIcon, Music } from 'lucide-react';
import type { components } from 'src/api/types';

type ResolvedFieldValue = components['schemas']['ResolvedFieldValue'];

type FieldValueProps = {
  field: ResolvedFieldValue;
  labeled: boolean;
  hidden?: boolean;
};

/** Renders one resolved prompt/answer field (ADR 031's `ResolvedFieldValue`). Text
 * renders as text; image/audio never render inline (ADR 027) — a small tappable chip
 * opens the value in a Radix Dialog overlay (ADR 016) instead, keeping every card's
 * zone height predictable regardless of what media it holds. `hidden` (MD-6) swaps
 * the value or media chip for the literal word "Hidden" in plain italic muted text —
 * the field's name label still renders per `labeled`, but the real value and any
 * chip/button are never in the DOM at all, so nothing leaks through a screen reader,
 * find-in-page, or a stray tap before the run page's single "Show answer" tap.
 * Shared by the run page's prompt/answer zones and, later, the completion
 * breakdown's detail view (which never passes `hidden`). */
export default function FieldValue({ field, labeled, hidden }: FieldValueProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      {labeled && <div className="text-xs font-medium text-(--color-text-muted)">{field.name}</div>}
      {hidden ? (
        <p className="italic text-(--color-text-muted)">Hidden</p>
      ) : field.type === 'text' ? (
        <p className="whitespace-pre-wrap text-lg font-semibold text-(--color-text)">
          {field.value}
        </p>
      ) : (
        <MediaChip field={field} />
      )}
    </div>
  );
}

function MediaChip({ field }: { field: ResolvedFieldValue }) {
  const [open, setOpen] = useState(false);
  const Icon = field.type === 'image' ? ImageIcon : Music;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-full bg-(--color-surface-elevated) px-3 text-sm text-(--color-text)"
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
          {field.name}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-(--color-scrim)" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-4 top-1/2 z-60 -translate-y-1/2 rounded-2xl bg-(--color-surface) p-4 focus:outline-none"
        >
          <Dialog.Title className="text-sm font-semibold text-(--color-text)">
            {field.name}
          </Dialog.Title>
          <div className="mt-3">
            {field.type === 'image' ? (
              <img
                src={field.value}
                alt={field.name}
                className="max-h-[70vh] w-full rounded-lg object-contain"
              />
            ) : (
              <audio controls src={field.value} className="w-full" />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
