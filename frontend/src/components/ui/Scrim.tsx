import { useLayoutEffect, useState, type ReactNode, type RefObject } from 'react';

type ScrimProps = {
  /** The control the panel belongs to: the scrim leaves a hole over its box and dims
   * everything else. The hole follows the box wherever it moves while the scrim is mounted. */
  anchor: RefObject<HTMLElement | null>;
  /** Called on a pointerdown on the scrim, which reaches nothing beneath; the caller
   * closes its panel. */
  onDismiss: () => void;
  /** How dark the dimming is: `fifth` of ink beneath a list of choices, `half` beneath the screen dimmed for a guest. */
  strength: 'fifth' | 'half';
};

const DIMMING: Record<ScrimProps['strength'], string> = {
  fifth: 'bg-(--color-ink)/20',
  half: 'bg-(--color-ink)/50',
};

/** Dims the whole screen beneath an anchored panel, above the app's header. Mount it only
 * while the panel is open: the page cannot scroll while it is mounted. A panel drawn with
 * it stacks above `z-50`. */
export default function Scrim({ anchor, onDismiss, strength }: ScrimProps): ReactNode {
  const [hole, setHole] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    // Locked before the first measure: losing the scrollbar can move the control.
    root.style.overflow = 'hidden';

    // Read every frame, since the control can move with nothing resized, as when the header
    // above it grows; state is set only on a move, so a still control costs no render.
    let last: DOMRect | null = null;
    let frame = 0;
    const measure = () => {
      const box = anchor.current?.getBoundingClientRect() ?? null;
      if (!sameBox(box, last)) {
        last = box;
        setHole(box);
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => {
      cancelAnimationFrame(frame);
      root.style.overflow = previousOverflow;
    };
  }, [anchor]);

  return (
    <div
      data-testid="scrim"
      className={`fixed inset-0 z-50 ${DIMMING[strength]}`}
      style={hole ? { clipPath: holeClipPath(hole) } : undefined}
      onPointerDown={(event) => {
        // Keeps focus in the control, so the user is still typing there once the panel closes.
        event.preventDefault();
        if (event.pointerType === 'touch' || event.pointerType === 'pen') swallowNextClick();
        onDismiss();
      }}
    />
  );
}

/** Swallows the click that ends a touch begun on the scrim. A touch's click comes after its
 * pointerdown, when the caller has already closed the panel and removed the scrim, so it would
 * land on whatever lay beneath. A later pointerdown means that click never came, and stands
 * the swallowing down so it cannot take the user's next tap. */
function swallowNextClick() {
  const swallow = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    standDown();
  };
  const standDown = () => {
    window.removeEventListener('click', swallow, true);
    window.removeEventListener('pointerdown', standDown, true);
  };
  window.addEventListener('click', swallow, true);
  window.addEventListener('pointerdown', standDown, true);
}

function sameBox(a: DOMRect | null, b: DOMRect | null): boolean {
  if (a === null || b === null) return a === b;
  return a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom;
}

/** A clip path of the whole screen less `rect`, which also lets pointer events through the
 * cut-out to the control. */
function holeClipPath({ left, top, right, bottom }: DOMRect): string {
  const screen = '0 0, 100% 0, 100% 100%, 0 100%, 0 0';
  const cutOut = [
    `${left}px ${top}px`,
    `${right}px ${top}px`,
    `${right}px ${bottom}px`,
    `${left}px ${bottom}px`,
    `${left}px ${top}px`,
  ].join(', ');
  return `polygon(evenodd, ${screen}, ${cutOut})`;
}
