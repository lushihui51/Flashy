// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState, type FormEvent } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormPart from 'src/components/ui/FormPart';
import SubmitButton from 'src/components/ui/SubmitButton';
import { renderWithRouter } from 'src/test/testUtils';

function rectOf(element: Element): DOMRect {
  const [top = 0, bottom = 0] = (element.getAttribute('data-rect') ?? '0,0').split(',').map(Number);
  return { top, bottom, height: bottom - top, y: top, x: 0, left: 0, right: 0, width: 0, toJSON: () => ({}) };
}

describe('SubmitButton', () => {
  let scrollBy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal('innerHeight', 500);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      return rectOf(this);
    });
    scrollBy = vi.spyOn(document.documentElement, 'scrollBy').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reads not ready through aria-disabled and stays pressable', () => {
    renderWithRouter(<SubmitButton ready={false}>Create</SubmitButton>);

    const button = screen.getByRole('button', { name: 'Create' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toBeEnabled();
  });

  it('carries no aria-disabled while ready', () => {
    renderWithRouter(<SubmitButton ready>Create</SubmitButton>);

    expect(screen.getByRole('button', { name: 'Create' })).not.toHaveAttribute('aria-disabled');
  });

  it('sets disabled only while busy', () => {
    renderWithRouter(
      <SubmitButton ready busy>
        Create
      </SubmitButton>,
    );

    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('a tap while not ready runs onNotReady, then scrolls the scroller once to what it set', async () => {
    const calls: string[] = [];
    function Form() {
      const [sentence, setSentence] = useState<string | null>(null);
      return (
        <>
          <FormPart sentence={sentence} look="wrong">
            <input aria-label="Name" />
          </FormPart>
          <SubmitButton
            ready={false}
            onNotReady={() => {
              calls.push('onNotReady');
              setSentence('Name is required.');
            }}
            onPress={() => calls.push('onPress')}
          >
            Create
          </SubmitButton>
        </>
      );
    }
    renderWithRouter(<Form />);

    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(calls).toEqual(['onNotReady']);
    expect(scrollBy).toHaveBeenCalledTimes(1);
  });

  it('a second tap that changes nothing still scrolls', async () => {
    renderWithRouter(
      <>
        <FormPart sentence="Name is required." look="wrong">
          <input aria-label="Name" />
        </FormPart>
        <SubmitButton ready={false}>Create</SubmitButton>
      </>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(scrollBy).toHaveBeenCalledTimes(2);
  });

  it('chooses the first sentence by DOM order over two shown', async () => {
    renderWithRouter(
      <>
        <div data-reveal-part data-rect="600,640">
          <p data-reveal-sentence data-rect="620,640">
            First
          </p>
        </div>
        <div data-reveal-part data-rect="900,940">
          <p data-reveal-sentence data-rect="920,940">
            Second
          </p>
        </div>
        <SubmitButton ready={false}>Create</SubmitButton>
      </>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(scrollBy).toHaveBeenCalledWith(0, 640 - 500);
  });

  it('a tap while ready calls onPress and reveals nothing', async () => {
    const onPress = vi.fn();
    renderWithRouter(
      <SubmitButton ready onPress={onPress}>
        Create
      </SubmitButton>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('submits its form while ready and never while not ready', async () => {
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    function Form({ ready }: { ready: boolean }) {
      return (
        <>
          <form id="the-form" onSubmit={onSubmit} />
          <SubmitButton ready={ready} form="the-form">
            Create
          </SubmitButton>
        </>
      );
    }
    const { unmount } = renderWithRouter(<Form ready={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(onSubmit).not.toHaveBeenCalled();
    unmount();

    renderWithRouter(<Form ready />);
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
