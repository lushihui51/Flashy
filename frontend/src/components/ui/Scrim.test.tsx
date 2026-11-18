// @vitest-environment jsdom
import { Profiler, useRef, useState } from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act, createEvent, fireEvent, render, screen } from '@testing-library/react';
import Scrim from 'src/components/ui/Scrim';

const RECT = { left: 16, top: 120, right: 374, bottom: 166, width: 358, height: 46, x: 16, y: 120 };
const BANNER = { left: 0, top: 0, right: 390, bottom: 44, width: 390, height: 44, x: 0, y: 0 };
const LOG_IN = { left: 300, top: 56, right: 374, bottom: 92, width: 74, height: 36, x: 300, y: 56 };

const BANNER_CUT_OUT =
  'M 0 0 H 390 A 0 0 0 0 1 390 0 V 44 A 0 0 0 0 1 390 44 H 0 A 0 0 0 0 1 0 44 V 0 A 0 0 0 0 1 0 0 Z';
// 36 high: 999px rounds to 18, half the shorter side.
const LOG_IN_CUT_OUT =
  'M 318 56 H 356 A 18 18 0 0 1 374 74 V 74 A 18 18 0 0 1 356 92 H 318 A 18 18 0 0 1 300 74 V 74 A 18 18 0 0 1 318 56 Z';

function mockRect(rect: typeof RECT) {
  return vi
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(() => ({ ...rect, toJSON: () => rect }));
}

/** Answers each element the box under its aria-label, so two lit elements stand apart. */
function mockRects(rects: Record<string, typeof RECT>) {
  return vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const rect = rects[this.getAttribute('aria-label') ?? '']!;
    return { ...rect, toJSON: () => rect };
  });
}

/** How many holes the scrim's clip path cuts: every sub-path after the screen's own. */
function holeCount(): number {
  return (screen.getByTestId('scrim').style.clipPath.match(/Z M /g) ?? []).length;
}

// Frames run only when a test calls runFrame, so a test sees each measure the scrim makes.
let frames = new Map<number, FrameRequestCallback>();
let nextFrame = 1;

function runFrame() {
  const due = [...frames.values()];
  frames = new Map();
  act(() => {
    for (const callback of due) callback(performance.now());
  });
}

function Harness({
  onDismiss,
  onBeneathClick = () => {},
  strength = 'fifth',
}: {
  onDismiss?: () => void;
  onBeneathClick?: () => void;
  strength?: 'fifth' | 'half';
}) {
  const control = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={control} aria-label="Control" />
      <button type="button" onClick={onBeneathClick}>
        Beneath
      </button>
      <Scrim lit={[control]} onDismiss={onDismiss} strength={strength} />
    </>
  );
}

/** A scrim naming two elements, a square-cornered banner and a pill, as the screen dimmed for a
 * guest does. */
function TwoLit({ logInMounted = true }: { logInMounted?: boolean }) {
  const banner = useRef<HTMLDivElement>(null);
  const logIn = useRef<HTMLButtonElement>(null);
  return (
    <>
      <div ref={banner} aria-label="Banner" />
      {logInMounted && (
        <button
          ref={logIn}
          type="button"
          aria-label="Log in"
          style={{
            borderTopLeftRadius: '999px',
            borderTopRightRadius: '999px',
            borderBottomRightRadius: '999px',
            borderBottomLeftRadius: '999px',
          }}
        />
      )}
      <Scrim lit={[banner, logIn]} strength="half" />
    </>
  );
}

function RemovedOnDismiss({ onBeneathClick }: { onBeneathClick: () => void }) {
  const control = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(true);
  return (
    <>
      <input ref={control} aria-label="Control" />
      <button type="button" onClick={onBeneathClick}>
        Beneath
      </button>
      {open && <Scrim lit={[control]} onDismiss={() => setOpen(false)} strength="fifth" />}
    </>
  );
}

beforeEach(() => {
  frames = new Map();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames.delete(id);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.documentElement.style.overflow = '';
});

describe('Scrim', () => {
  it("names a lit element's rect in its inline style", () => {
    mockRect(RECT);
    render(<Harness />);

    const { clipPath } = screen.getByTestId('scrim').style;
    expect(clipPath).toContain('M 16 120 H 374');
    expect(clipPath).toContain('374 120 V 166');
    expect(clipPath).toContain('374 166 H 16');
    expect(clipPath).toContain('16 166 V 120');
  });

  it("rounds a hole's corners as its element's are, at most half its shorter side", () => {
    mockRect(RECT);
    function Rounded() {
      const control = useRef<HTMLInputElement>(null);
      return (
        <>
          <input
            ref={control}
            aria-label="Control"
            style={{
              borderTopLeftRadius: '14px',
              borderTopRightRadius: '999px',
              borderBottomRightRadius: '50%',
              borderBottomLeftRadius: '0px',
            }}
          />
          <Scrim lit={[control]} onDismiss={() => {}} strength="half" />
        </>
      );
    }
    render(<Rounded />);

    // 46 high: 999px and 50% each round to 23, half the shorter side.
    expect(screen.getByTestId('scrim').style.clipPath).toContain(
      'M 30 120 H 351 A 23 23 0 0 1 374 143 V 143 A 23 23 0 0 1 351 166 H 16 A 0 0 0 0 1 16 166 V 134 A 14 14 0 0 1 30 120 Z',
    );
  });

  it('dims at a fifth of ink for fifth and at a half for half', () => {
    const { unmount } = render(<Harness strength="fifth" />);
    expect(screen.getByTestId('scrim')).toHaveClass('bg-(--color-ink)/20');
    unmount();

    render(<Harness strength="half" />);
    expect(screen.getByTestId('scrim')).toHaveClass('bg-(--color-ink)/50');
  });

  it('cuts one hole over each named element, each in its own corners', () => {
    mockRects({ Banner: BANNER, 'Log in': LOG_IN });
    render(<TwoLit />);

    const { clipPath } = screen.getByTestId('scrim').style;
    expect(clipPath).toContain(BANNER_CUT_OUT);
    expect(clipPath).toContain(LOG_IN_CUT_OUT);
    expect(holeCount()).toBe(2);
  });

  it("moves one hole when its element's box moves between two frames, leaves the other, and renders nothing new while both are still", () => {
    const rect = mockRects({ Banner: BANNER, 'Log in': LOG_IN });
    const onRender = vi.fn();
    render(
      <Profiler id="scrim" onRender={onRender}>
        <TwoLit />
      </Profiler>,
    );

    const moved = { ...LOG_IN, top: 96, bottom: 132, y: 96 };
    rect.mockRestore();
    const movedRect = mockRects({ Banner: BANNER, 'Log in': moved });
    runFrame();
    const { clipPath } = screen.getByTestId('scrim').style;
    expect(clipPath).toContain(BANNER_CUT_OUT);
    expect(clipPath).toContain('M 318 96 H 356 A 18 18 0 0 1 374 114');
    expect(clipPath).not.toContain(LOG_IN_CUT_OUT);
    expect(holeCount()).toBe(2);

    const rendersAfterMove = onRender.mock.calls.length;
    const readsAfterMove = movedRect.mock.calls.length;
    runFrame();
    runFrame();
    // One read of each element's box a frame.
    expect(movedRect.mock.calls.length).toBe(readsAfterMove + 4);
    expect(onRender.mock.calls.length).toBe(rendersAfterMove);
    expect(screen.getByTestId('scrim').style.clipPath).toBe(clipPath);
  });

  it("cuts no hole over a named element that is not mounted, and keeps the other's", () => {
    mockRects({ Banner: BANNER, 'Log in': LOG_IN });
    render(<TwoLit logInMounted={false} />);
    runFrame();

    const { clipPath } = screen.getByTestId('scrim').style;
    expect(clipPath).toContain(BANNER_CUT_OUT);
    expect(holeCount()).toBe(1);
  });

  it('cuts a hole on the frame after a named element mounts, and takes it away on the frame after it is gone', () => {
    mockRects({ Banner: BANNER, 'Log in': LOG_IN });
    const { rerender } = render(<TwoLit logInMounted={false} />);

    rerender(<TwoLit />);
    runFrame();
    expect(screen.getByTestId('scrim').style.clipPath).toContain(LOG_IN_CUT_OUT);
    expect(holeCount()).toBe(2);

    rerender(<TwoLit logInMounted={false} />);
    runFrame();
    expect(screen.getByTestId('scrim').style.clipPath).toContain(BANNER_CUT_OUT);
    expect(holeCount()).toBe(1);
  });

  it('goes on measuring, and keeps the page locked, through a re-render that hands it a new lit array', () => {
    mockRect(RECT);
    const { rerender } = render(<Harness />);
    const pending = [...frames.keys()];

    rerender(<Harness strength="half" />);
    expect([...frames.keys()]).toEqual(pending);
    expect(document.documentElement.style.overflow).toBe('hidden');
  });

  it('stops measuring once unmounted', () => {
    const rect = mockRect(RECT);
    const { unmount } = render(<Harness />);
    runFrame();
    expect(frames.size).toBe(1);

    unmount();
    expect(frames.size).toBe(0);
    const readsAtUnmount = rect.mock.calls.length;
    runFrame();
    expect(rect.mock.calls.length).toBe(readsAtUnmount);
  });

  it('calls onDismiss once on a pointerdown and prevents its default', () => {
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);

    const scrim = screen.getByTestId('scrim');
    const event = createEvent.pointerDown(scrim);
    fireEvent(scrim, event);

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('with no onDismiss, prevents a pointerdown on it and runs nothing beneath', () => {
    const onBeneathClick = vi.fn();
    render(<Harness onBeneathClick={onBeneathClick} />);

    const scrim = screen.getByTestId('scrim');
    const event = createEvent.pointerDown(scrim, { pointerType: 'touch' });
    fireEvent(scrim, event);
    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByTestId('scrim')).toBeInTheDocument();

    // The click that ends the touch is swallowed, and the one after is the user's own.
    const beneath = screen.getByRole('button', { name: 'Beneath' });
    fireEvent.click(beneath);
    expect(onBeneathClick).not.toHaveBeenCalled();

    fireEvent.click(beneath);
    expect(onBeneathClick).toHaveBeenCalledTimes(1);
  });

  it('locks the page scroll while mounted and restores the previous value after', () => {
    document.documentElement.style.overflow = 'scroll';
    const { unmount } = render(<Harness />);
    expect(document.documentElement.style.overflow).toBe('hidden');

    unmount();
    expect(document.documentElement.style.overflow).toBe('scroll');
  });

  it('runs a handler beneath only on a click dispatched at it, never on a pointerdown on the scrim', () => {
    const onBeneathClick = vi.fn();
    render(<Harness onBeneathClick={onBeneathClick} />);

    fireEvent.pointerDown(screen.getByTestId('scrim'));
    expect(onBeneathClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Beneath' }));
    expect(onBeneathClick).toHaveBeenCalledTimes(1);
  });

  it('swallows the click that ends a touch on the scrim, once the scrim is gone', () => {
    const onBeneathClick = vi.fn();
    render(<RemovedOnDismiss onBeneathClick={onBeneathClick} />);

    fireEvent.pointerDown(screen.getByTestId('scrim'), { pointerType: 'touch' });
    expect(screen.queryByTestId('scrim')).not.toBeInTheDocument();

    const beneath = screen.getByRole('button', { name: 'Beneath' });
    fireEvent.click(beneath);
    expect(onBeneathClick).not.toHaveBeenCalled();

    fireEvent.click(beneath);
    expect(onBeneathClick).toHaveBeenCalledTimes(1);
  });

  it('lets the next tap through when the click ending a touch on the scrim never came', () => {
    const onBeneathClick = vi.fn();
    render(<RemovedOnDismiss onBeneathClick={onBeneathClick} />);

    fireEvent.pointerDown(screen.getByTestId('scrim'), { pointerType: 'touch' });

    const beneath = screen.getByRole('button', { name: 'Beneath' });
    fireEvent.pointerDown(beneath, { pointerType: 'touch' });
    fireEvent.click(beneath);
    expect(onBeneathClick).toHaveBeenCalledTimes(1);
  });

  it('leaves the next click alone after a mouse pointerdown', () => {
    const onBeneathClick = vi.fn();
    render(<RemovedOnDismiss onBeneathClick={onBeneathClick} />);

    fireEvent.pointerDown(screen.getByTestId('scrim'), { pointerType: 'mouse' });

    fireEvent.click(screen.getByRole('button', { name: 'Beneath' }));
    expect(onBeneathClick).toHaveBeenCalledTimes(1);
  });
});
