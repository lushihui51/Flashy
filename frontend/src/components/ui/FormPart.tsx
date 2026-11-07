import type { ReactNode } from 'react';

type FormPartProps = {
  /** The sentence about this part, or null for none. */
  sentence: string | null;
  /** `wrong`: a refusal or a blank required field, red, spoken as an alert. `aside`: a hint,
   * muted. Which sentence takes which look is what each form has today. */
  look: 'wrong' | 'aside';
  /** The part itself: its label and control. */
  children: ReactNode;
  /** Classes of the wrapper around the part and its sentence. */
  className?: string;
};

/** One part of a form with its sentence under it. A reveal finds the sentence by its mark and
 * brings it on screen with this part, so a sentence is drawn here rather than beside a ref. Keep
 * a `label` wrapping a control among the children, so the sentence stays out of its name. */
export default function FormPart({ sentence, look, children, className }: FormPartProps): ReactNode {
  return (
    <div data-reveal-part className={className}>
      {children}
      {sentence !== null &&
        (look === 'wrong' ? (
          <p data-reveal-sentence role="alert" className="text-sm text-(--color-wrong)">
            {sentence}
          </p>
        ) : (
          <p data-reveal-sentence className="text-sm text-(--color-aside)">
            {sentence}
          </p>
        ))}
    </div>
  );
}
