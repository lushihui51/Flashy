import type { ReactNode } from 'react';

type ReadOnlyButtonProps = {
  /** Runs on a press; the button does nothing else. */
  onPress: () => void;
  /** The button's shape and size; the component adds the greyed colours. */
  className?: string;
  'aria-label'?: string;
  children: ReactNode;
};

/** A button that shows what cannot be changed: `aria-disabled`, greyed, never `disabled`. */
export default function ReadOnlyButton({
  onPress,
  className = '',
  'aria-label': ariaLabel,
  children,
}: ReadOnlyButtonProps): ReactNode {
  return (
    <button
      type="button"
      aria-disabled="true"
      aria-label={ariaLabel}
      onClick={() => onPress()}
      className={`${className} aria-disabled:border-(--color-line) aria-disabled:bg-(--color-surface) aria-disabled:text-(--color-aside) aria-disabled:[box-shadow:none]`}
    >
      {children}
    </button>
  );
}
