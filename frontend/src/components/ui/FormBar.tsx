import { useLayoutEffect, useRef, type ReactNode } from 'react';

type FormBarProps = {
  /** The sentence of a failed Create or Save, above the buttons, until the caller clears it. */
  sentence?: string | null;
  /** One line directly above the buttons, New practice's "N selected". */
  count?: string | null;
  /** The buttons, in reading order: Cancel or Done first, Create or Save last. */
  children: ReactNode;
};

/** A form's bar, fixed to the foot of the screen while the page scrolls. Render it where the
 * form's content ends, as the last child of the form's container: it holds its own height open
 * there, so the last field can scroll clear of it. A form opened over another form renders a
 * bar of its own. */
export default function FormBar({ sentence, count, children }: FormBarProps): ReactNode {
  const spacerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Before the first paint, so no frame shows the last field behind the bar, and again as the
  // sentence and the count come and go.
  useLayoutEffect(() => {
    const spacer = spacerRef.current;
    const bar = barRef.current;
    if (!spacer || !bar) return;
    const writeHeight = () => {
      spacer.style.height = `${bar.getBoundingClientRect().height}px`;
    };
    writeHeight();
    const observer = new ResizeObserver(writeHeight);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={spacerRef} aria-hidden className="shrink-0" />
      {/* z-10: above the page's content and beneath the drawer's and the sheets' scrims. The
          mark tells a reveal to keep clear of the bar; it is on every bar so that no form can
          leave it off. */}
      <div
        ref={barRef}
        data-reveal-clear
        data-testid="form-bar"
        className="ruled-top-line fixed inset-x-0 bottom-0 z-10 flex flex-col gap-2 bg-(--color-ground) px-4 pt-3 pb-4"
      >
        {sentence && (
          <p role="alert" className="text-center text-sm text-(--color-wrong)">
            {sentence}
          </p>
        )}
        {count && <p className="text-center text-label text-(--color-aside)">{count}</p>}
        <div className="flex items-center gap-2.5">{children}</div>
      </div>
    </>
  );
}
