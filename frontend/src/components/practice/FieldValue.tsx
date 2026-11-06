import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Image as ImageIcon, Music } from 'lucide-react';
import type { components } from 'src/api/types';

type ResolvedFieldValue = components['schemas']['ResolvedFieldValue'];

type FieldValueProps = {
  field: ResolvedFieldValue;
  labeled: boolean;
  hidden?: boolean;
  /** The run page's zone this value sits in, which sets its size. Left out, the value
   * is drawn at the size of a card opened from the summary. */
  zone?: 'prompt' | 'answer';
};

const LONGEST_LARGE_PROMPT = 12;

function textValueClass(value: string, zone: FieldValueProps['zone']) {
  if (zone === 'answer') return 'text-xl leading-[1.25] font-semibold';
  if (zone === 'prompt') {
    return value.length <= LONGEST_LARGE_PROMPT
      ? 'text-[3.375rem] leading-none font-bold tracking-[-0.02em]'
      : 'text-value leading-[1.1] font-bold tracking-[-0.01em]';
  }
  return 'text-base leading-[1.35] font-semibold';
}

/** Renders one resolved prompt/answer field. Text renders as text; image/audio never
 * render inline — a small tappable chip opens the value in a Radix Dialog overlay
 * instead, keeping every card's zone height predictable regardless of what media it
 * holds. `hidden` swaps the value or media chip for one "Hidden" tile the width of its
 * row, whatever the value's length or type — the field's name label still renders per
 * `labeled`, but the real value and any chip/button are never in the DOM at all, so
 * nothing leaks through a screen reader, find-in-page, or a stray tap before the run
 * page's single "Show answer" tap. Shared by the run page's prompt/answer zones and a card opened
 * from the summary (which never passes `hidden`). */
export default function FieldValue({ field, labeled, hidden, zone }: FieldValueProps) {
  return (
    <div className={`flex min-w-0 flex-col ${!zone ? 'gap-0.5' : hidden ? 'gap-2' : 'gap-1'}`}>
      {labeled && (
        <div
          className={
            zone ? 'text-label text-(--color-aside)' : 'text-xs font-medium text-(--color-aside)'
          }
        >
          {field.name}
        </div>
      )}
      {hidden ? (
        <p className="flex h-8.5 w-full items-center rounded-tight bg-(--color-hidden) px-3 text-sm font-semibold text-(--color-ink)">
          Hidden
        </p>
      ) : field.type === 'text' ? (
        <p
          className={`wrap-anywhere whitespace-pre-wrap text-(--color-ink) ${textValueClass(field.value, zone)}`}
        >
          {field.value}
        </p>
      ) : (
        <MediaChip field={field} block={zone !== undefined} />
      )}
    </div>
  );
}

function MediaChip({ field, block }: { field: ResolvedFieldValue; block: boolean }) {
  const [open, setOpen] = useState(false);
  const Icon = field.type === 'image' ? ImageIcon : Music;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={`mt-1 inline-flex h-9 w-fit items-center gap-1.5 rounded-full px-3 text-sm text-(--color-ink) ${
            block ? 'tappable-sm bg-(--color-surface) font-semibold' : 'bg-(--color-ground)'
          }`}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
          {field.name}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-(--color-ink)/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-4 top-1/2 z-60 -translate-y-1/2 rounded-2xl bg-(--color-surface) p-4 focus:outline-none"
        >
          <Dialog.Title className="text-sm font-semibold text-(--color-ink)">
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
