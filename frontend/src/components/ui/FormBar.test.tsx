// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import FormBar from 'src/components/ui/FormBar';

function renderBar(props: { sentence?: string | null; count?: string | null } = {}) {
  return render(
    <FormBar {...props}>
      <button type="button">Cancel</button>
      <button type="button">Create</button>
    </FormBar>,
  );
}

describe('FormBar', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('is fixed to the foot and carries the mark a reveal clears', () => {
    renderBar();

    const bar = screen.getByTestId('form-bar');
    expect(bar).toHaveAttribute('data-reveal-clear');
    expect(bar).toHaveClass('fixed', 'inset-x-0', 'bottom-0', 'z-10');
  });

  it('renders the sentence above the count, and the count above the buttons in order', () => {
    renderBar({ sentence: 'It failed.', count: '3 selected' });

    const sentence = screen.getByRole('alert');
    const count = screen.getByText('3 selected');
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const create = screen.getByRole('button', { name: 'Create' });
    expect(sentence).toHaveTextContent('It failed.');
    expect(sentence.compareDocumentPosition(count)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(count.compareDocumentPosition(cancel)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(cancel.compareDocumentPosition(create)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByTestId('form-bar')).toContainElement(sentence);
    expect(screen.getByTestId('form-bar')).toContainElement(count);
  });

  it('renders neither the sentence nor the count when null', () => {
    renderBar({ sentence: null, count: null });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // The row of buttons is the only child left.
    expect(screen.getByTestId('form-bar').children).toHaveLength(1);
  });

  it('keeps a hidden spacer of its height in the flow, follows the height, and stops on unmount', () => {
    let barHeight = 80;
    let barResized: () => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        callback: () => void;
        constructor(callback: () => void) {
          this.callback = callback;
        }
        observe(target: Element) {
          if (target.getAttribute('data-testid') === 'form-bar') barResized = this.callback;
        }
        unobserve() {}
        disconnect = disconnect;
      },
    );
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, 0, 390, barHeight),
    );

    const { unmount } = renderBar();
    const spacer = screen.getByTestId('form-bar').previousElementSibling as HTMLElement;
    expect(spacer).toHaveAttribute('aria-hidden', 'true');
    expect(spacer.style.height).toBe('80px');

    barHeight = 124;
    act(() => barResized());
    expect(spacer.style.height).toBe('124px');
    expect(document.documentElement.getAttribute('style')).toBeNull();

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
