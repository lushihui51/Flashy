// @vitest-environment jsdom
import { Profiler, useRef, useState } from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act, createEvent, fireEvent, render, screen } from '@testing-library/react';
import Scrim from 'src/components/ui/Scrim';

const RECT = { left: 16, top: 120, right: 374, bottom: 166, width: 358, height: 46, x: 16, y: 120 };

function mockRect(rect: typeof RECT) {
  return vi
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(() => ({ ...rect, toJSON: () => rect }));
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
  onDismiss = () => {},
  onBeneathClick = () => {},
  strength = 'fifth',
}: {
  onDismiss?: () => void;
  onBeneathClick?: () => void;
  strength?: 'fifth' | 'half';
}) {
  const anchor = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={anchor} aria-label="Control" />
      <button type="button" onClick={onBeneathClick}>
        Beneath
      </button>
      <Scrim anchor={anchor} onDismiss={onDismiss} strength={strength} />
    </>
  );
}

function RemovedOnDismiss({ onBeneathClick }: { onBeneathClick: () => void }) {
  const anchor = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(true);
  return (
    <>
      <input ref={anchor} aria-label="Control" />
      <button type="button" onClick={onBeneathClick}>
        Beneath
      </button>
      {open && <Scrim anchor={anchor} onDismiss={() => setOpen(false)} strength="fifth" />}
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
  it("names the anchor's rect in its inline style", () => {
    mockRect(RECT);
    render(<Harness />);

    const { clipPath } = screen.getByTestId('scrim').style;
    expect(clipPath).toContain('M 16 120 H 374');
    expect(clipPath).toContain('374 120 V 166');
    expect(clipPath).toContain('374 166 H 16');
    expect(clipPath).toContain('16 166 V 120');
  });

  it("rounds the hole's corners as the anchor's are, at most half its shorter side", () => {
    mockRect(RECT);
    function Rounded() {
      const anchor = useRef<HTMLInputElement>(null);
      return (
        <>
          <input
            ref={anchor}
            aria-label="Control"
            style={{
              borderTopLeftRadius: '14px',
              borderTopRightRadius: '999px',
              borderBottomRightRadius: '50%',
              borderBottomLeftRadius: '0px',
            }}
          />
          <Scrim anchor={anchor} onDismiss={() => {}} strength="half" />
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

  it("moves the hole when the anchor's box moves between two frames, and renders nothing new while it is still", () => {
    const rect = mockRect(RECT);
    const onRender = vi.fn();
    render(
      <Profiler id="scrim" onRender={onRender}>
        <Harness />
      </Profiler>,
    );

    const moved = { ...RECT, top: 160, bottom: 206, y: 160 };
    rect.mockImplementation(() => ({ ...moved, toJSON: () => moved }));
    runFrame();
    expect(screen.getByTestId('scrim').style.clipPath).toContain('M 16 160');

    const rendersAfterMove = onRender.mock.calls.length;
    const readsAfterMove = rect.mock.calls.length;
    runFrame();
    runFrame();
    expect(rect.mock.calls.length).toBe(readsAfterMove + 2);
    expect(onRender.mock.calls.length).toBe(rendersAfterMove);
    expect(screen.getByTestId('scrim').style.clipPath).toContain('M 16 160');
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
