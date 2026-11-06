// @vitest-environment jsdom
import { useRef, useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, createEvent, fireEvent, render, screen } from '@testing-library/react';
import Scrim from 'src/components/ui/Scrim';

const RECT = { left: 16, top: 120, right: 374, bottom: 166, width: 358, height: 46, x: 16, y: 120 };

function mockRect(rect: typeof RECT) {
  return vi
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockReturnValue({ ...rect, toJSON: () => rect });
}

function Harness({
  onDismiss = () => {},
  onBeneathClick = () => {},
}: {
  onDismiss?: () => void;
  onBeneathClick?: () => void;
}) {
  const anchor = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={anchor} aria-label="Control" />
      <button type="button" onClick={onBeneathClick}>
        Beneath
      </button>
      <Scrim anchor={anchor} onDismiss={onDismiss} />
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
      {open && <Scrim anchor={anchor} onDismiss={() => setOpen(false)} />}
    </>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.style.overflow = '';
});

describe('Scrim', () => {
  it("names the anchor's rect in its inline style", () => {
    mockRect(RECT);
    render(<Harness />);

    const { clipPath } = screen.getByTestId('scrim').style;
    expect(clipPath).toContain('16px 120px');
    expect(clipPath).toContain('374px 120px');
    expect(clipPath).toContain('374px 166px');
    expect(clipPath).toContain('16px 166px');
  });

  it('measures the anchor again on a window resize', () => {
    const rect = mockRect(RECT);
    render(<Harness />);

    rect.mockReturnValue({ ...RECT, left: 40, right: 398, toJSON: () => RECT });
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.getByTestId('scrim').style.clipPath).toContain('40px 120px');
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
