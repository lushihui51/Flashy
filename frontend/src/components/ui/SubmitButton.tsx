import type { MouseEvent, ReactNode } from 'react';
import { useViewParams } from 'src/lib/viewParams';

type SubmitButtonProps = {
  /** False reads not ready through `aria-disabled`; the button stays pressable. */
  ready: boolean;
  /** True while the request is in flight; the one state that sets `disabled`. */
  busy?: boolean;
  /** Runs on a tap while not ready, before the reveal; the form sets its sentences here. */
  onNotReady?: () => void;
  /** Runs on a tap while ready. For a `form` submit, the form's `onSubmit` runs instead. */
  onPress?: () => void;
  /** The id of the form this button submits. */
  form?: string;
  children: ReactNode;
};

/** A form's Create or Save, for the form's bar. A tap while not ready shows the form's first
 * sentence and its part. Render it under a router. */
export default function SubmitButton({
  ready,
  busy = false,
  onNotReady,
  onPress,
  form,
  children,
}: SubmitButtonProps): ReactNode {
  const { revealFirstSentence } = useViewParams();

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (!ready) {
      // Stops the form's submit, which a press of Enter in a field also comes through.
      event.preventDefault();
      onNotReady?.();
      revealFirstSentence(event.currentTarget);
      return;
    }
    onPress?.();
  };

  return (
    <button
      type={form === undefined ? 'button' : 'submit'}
      form={form}
      disabled={busy}
      aria-disabled={!ready || undefined}
      onClick={handleClick}
      className="tappable flex-1 h-action rounded-2xl bg-(--color-main-action) px-4.5 text-action font-semibold text-(--color-ink) disabled:border-(--color-line) disabled:bg-(--color-surface) disabled:text-(--color-aside) disabled:[box-shadow:none] aria-disabled:border-(--color-line) aria-disabled:bg-(--color-surface) aria-disabled:text-(--color-aside) aria-disabled:[box-shadow:none]"
    >
      {children}
    </button>
  );
}
