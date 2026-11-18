// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useRef } from 'react';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import GuestScrim from 'src/components/shell/GuestScrim';

const BANNER = { left: 0, top: 0, right: 390, bottom: 36, width: 390, height: 36, x: 0, y: 0 };
const LOG_IN = { left: 297, top: 45, right: 374, bottom: 89, width: 77, height: 44, x: 297, y: 45 };

/** The guest's banner, "Log in", the control a guest pressed, and the dimmed screen in a slot of
 * its own, so a test reads everything it renders. */
function Harness({ open, onClose }: { open: boolean; onClose: () => void }) {
  const banner = useRef<HTMLDivElement>(null);
  const logIn = useRef<HTMLButtonElement>(null);
  return (
    <>
      <div ref={banner} role="status">
        This is an example. Log in to use all of Flashy.
      </div>
      <button ref={logIn} type="button">
        Log in
      </button>
      <button type="button">Start run</button>
      <div data-testid="slot">
        <GuestScrim open={open} onClose={onClose} banner={banner} logIn={logIn} />
      </div>
    </>
  );
}

/** The document's listeners for the two events the dimmed screen closes on. */
function closingListeners(calls: readonly unknown[][]): unknown[] {
  return calls
    .filter(([type]) => type === 'pointerdown' || type === 'keydown')
    .map(([type]) => type);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GuestScrim', () => {
  it('renders nothing while closed, and the scrim alone at half of ink while open, with no sentence and no move of focus', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const rect = this.getAttribute('role') === 'status' ? BANNER : LOG_IN;
      return { ...rect, toJSON: () => rect };
    });
    const { rerender } = render(<Harness open={false} onClose={() => {}} />);
    const slot = screen.getByTestId('slot');
    const pressed = screen.getByRole('button', { name: 'Start run' });
    pressed.focus();
    const outsideTheSlot = document.body.childElementCount;
    expect(slot).toBeEmptyDOMElement();
    expect(document.documentElement.style.overflow).toBe('');

    rerender(<Harness open onClose={() => {}} />);

    const scrim = screen.getByTestId('scrim');
    expect([...slot.children]).toEqual([scrim]);
    expect(scrim).toBeEmptyDOMElement();
    expect(scrim).toHaveClass('bg-(--color-ink)/50');
    // Nothing is drawn in a portal, and the banner's own sentence is the only one.
    expect(document.body.childElementCount).toBe(outsideTheSlot);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getAllByText(/Log in to use all of Flashy\./)).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // One hole each over the banner and "Log in".
    expect(scrim.style.clipPath).toContain('Z M 0 0 H 390 ');
    expect(scrim.style.clipPath).toContain('Z M 297 45 H 374 ');
    expect(scrim.style.clipPath.match(/Z M /g)).toHaveLength(2);
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(pressed).toHaveFocus();

    rerender(<Harness open={false} onClose={() => {}} />);

    expect(slot).toBeEmptyDOMElement();
    expect(document.documentElement.style.overflow).toBe('');
    expect(pressed).toHaveFocus();
  });

  it('calls onClose on a pointerdown on the scrim, on a pointerdown on a lit element and on Escape, on no other key, and on none of them once closed', () => {
    const onClose = vi.fn();
    const { rerender } = render(<Harness open onClose={onClose} />);
    const logIn = screen.getByRole('button', { name: 'Log in' });
    // What a listener past the document sees: the event went on, with nothing prevented.
    const passedOn = vi.fn((event: Event) => event.defaultPrevented);
    window.addEventListener('pointerdown', passedOn);
    window.addEventListener('keydown', passedOn);

    fireEvent.pointerDown(screen.getByTestId('scrim'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.pointerDown(logIn);
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(passedOn).toHaveLastReturnedWith(false);

    fireEvent.pointerDown(screen.getByRole('status'));
    expect(onClose).toHaveBeenCalledTimes(3);
    expect(passedOn).toHaveLastReturnedWith(false);
    expect(passedOn).toHaveBeenCalledTimes(3);

    const escape = createEvent.keyDown(logIn, { key: 'Escape' });
    fireEvent(logIn, escape);
    expect(onClose).toHaveBeenCalledTimes(4);
    expect(escape.defaultPrevented).toBe(false);
    expect(passedOn).toHaveBeenCalledTimes(4);

    for (const key of ['Enter', ' ', 'Tab', 'a']) fireEvent.keyDown(logIn, { key });
    expect(onClose).toHaveBeenCalledTimes(4);

    rerender(<Harness open={false} onClose={onClose} />);
    fireEvent.pointerDown(logIn);
    fireEvent.pointerDown(document.body);
    fireEvent.keyDown(logIn, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(4);

    window.removeEventListener('pointerdown', passedOn);
    window.removeEventListener('keydown', passedOn);
  });

  it('adds its two listeners when it opens, keeps them through a re-render that hands it a new onClose, and removes them when it closes', () => {
    const added = vi.spyOn(document, 'addEventListener');
    const removed = vi.spyOn(document, 'removeEventListener');
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Harness open={false} onClose={first} />);
    expect(closingListeners(added.mock.calls)).toEqual([]);

    rerender(<Harness open onClose={first} />);
    expect(closingListeners(added.mock.calls)).toEqual(['pointerdown', 'keydown']);

    rerender(<Harness open onClose={second} />);
    expect(closingListeners(added.mock.calls)).toEqual(['pointerdown', 'keydown']);
    expect(closingListeners(removed.mock.calls)).toEqual([]);
    fireEvent.pointerDown(document.body);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    rerender(<Harness open={false} onClose={second} />);
    expect(closingListeners(removed.mock.calls)).toEqual(['pointerdown', 'keydown']);
  });
});
