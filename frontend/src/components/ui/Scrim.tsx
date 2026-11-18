import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

type ScrimProps = {
  /** The elements left lit: the scrim cuts one hole over each one's box, in that element's own
   * corners, and dims everything else. Each hole follows its box wherever it moves while the
   * scrim is mounted. A named element that is not mounted gets no hole. */
  lit: readonly RefObject<HTMLElement | null>[];
  /** Called on a pointerdown on the scrim, which reaches nothing beneath; a caller with a panel
   * closes it. */
  onDismiss?: () => void;
  /** How dark the dimming is: `fifth` of ink beneath a list of choices, `half` beneath the screen dimmed for a guest. */
  strength: 'fifth' | 'half';
};

const DIMMING: Record<ScrimProps['strength'], string> = {
  fifth: 'bg-(--color-ink)/20',
  half: 'bg-(--color-ink)/50',
};

/** Dims the whole screen, above the app's header, but for the elements its caller names. Mount
 * it only while the screen is to be dimmed: the page cannot scroll while it is mounted. A panel
 * drawn with it stacks above `z-50`. */
export default function Scrim({ lit, onDismiss, strength }: ScrimProps): ReactNode {
  const [holes, setHoles] = useState<Hole[]>([]);

  // The measuring below reads the latest `lit` through this, so a caller that hands a new array
  // on a re-render restarts neither the measuring nor the scroll lock.
  const litRef = useRef(lit);
  useLayoutEffect(() => {
    litRef.current = lit;
  });

  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    // Locked before the first measure: losing the scrollbar can move a lit element.
    root.style.overflow = 'hidden';

    // Read every frame, since a lit element can move with nothing resized, as when the header
    // above it grows; state is set only on a frame where a box has moved, appeared or gone, so
    // still elements cost no render.
    let last: (DOMRect | null)[] = [];
    let frame = 0;
    const measure = () => {
      const elements = litRef.current.map((ref) => ref.current);
      const boxes = elements.map((element) => element?.getBoundingClientRect() ?? null);
      if (boxes.length !== last.length || boxes.some((box, i) => !sameBox(box, last[i] ?? null))) {
        last = boxes;
        setHoles(
          elements.flatMap((element, i) => {
            const box = boxes[i];
            return element && box ? [{ box, radii: cornerRadii(element, box) }] : [];
          }),
        );
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => {
      cancelAnimationFrame(frame);
      root.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      data-testid="scrim"
      className={`fixed inset-0 z-50 ${DIMMING[strength]}`}
      style={holes.length > 0 ? { clipPath: holeClipPath(holes) } : undefined}
      onPointerDown={(event) => {
        // Keeps focus where it is, so a user typing in a lit control is still typing there once
        // the scrim is gone.
        event.preventDefault();
        if (event.pointerType === 'touch' || event.pointerType === 'pen') swallowNextClick();
        onDismiss?.();
      }}
    />
  );
}

/** Swallows the click that ends a touch begun on the scrim. A touch's click comes after its
 * pointerdown, by when the caller can have removed the scrim, so it would land on whatever lay
 * beneath. A later pointerdown means that click never came, and stands the swallowing down so it
 * cannot take the user's next tap. */
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

/** A lit element's box, and its corners' radii in px: top left, top right, bottom right, bottom
 * left. */
type Hole = { box: DOMRect; radii: [number, number, number, number] };

/** The element's four corner radii in px, each at most half its shorter side, as the browser
 * draws them. */
function cornerRadii(element: HTMLElement, box: DOMRect): Hole['radii'] {
  const style = getComputedStyle(element);
  const most = Math.min(box.width, box.height) / 2;
  const radius = (value: string) => {
    const length = parseFloat(value) || 0;
    const px = value.trim().split(/\s+/)[0]!.endsWith('%')
      ? (length / 100) * Math.min(box.width, box.height)
      : length;
    return Math.min(Math.max(px, 0), most);
  };
  return [
    radius(style.borderTopLeftRadius),
    radius(style.borderTopRightRadius),
    radius(style.borderBottomRightRadius),
    radius(style.borderBottomLeftRadius),
  ];
}

/** A clip path of the whole screen less each hole's rounded box, which also lets pointer events
 * through each cut-out to the element beneath. Two holes that overlapped would dim their
 * overlap. */
function holeClipPath(holes: readonly Hole[]): string {
  // Far past any screen, so the dimming needs no measure of the window.
  const screen = 'M -1 -1 H 100000 V 100000 H -1 Z';
  const cutOuts = holes.map(({ box: { left, top, right, bottom }, radii: [tl, tr, br, bl] }) =>
    [
      `M ${left + tl} ${top}`,
      `H ${right - tr}`,
      `A ${tr} ${tr} 0 0 1 ${right} ${top + tr}`,
      `V ${bottom - br}`,
      `A ${br} ${br} 0 0 1 ${right - br} ${bottom}`,
      `H ${left + bl}`,
      `A ${bl} ${bl} 0 0 1 ${left} ${bottom - bl}`,
      `V ${top + tl}`,
      `A ${tl} ${tl} 0 0 1 ${left + tl} ${top}`,
      'Z',
    ].join(' '),
  );
  return `path(evenodd, "${[screen, ...cutOuts].join(' ')}")`;
}
