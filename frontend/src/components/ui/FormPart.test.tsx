// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import FormPart from 'src/components/ui/FormPart';

describe('FormPart', () => {
  it('marks the wrapper around the part and draws no sentence for null', () => {
    const { container } = render(
      <FormPart sentence={null} look="wrong" className="mt-4">
        <input aria-label="Name" />
      </FormPart>,
    );

    const part = container.querySelector('[data-reveal-part]');
    expect(part).toHaveClass('mt-4');
    expect(part).toContainElement(screen.getByRole('textbox', { name: 'Name' }));
    expect(container.querySelector('[data-reveal-sentence]')).toBeNull();
  });

  it('draws a wrong sentence in red as an alert, after the part and inside the wrapper', () => {
    const { container } = render(
      <FormPart sentence="Name is required." look="wrong">
        <input aria-label="Name" />
      </FormPart>,
    );

    const sentence = screen.getByRole('alert');
    expect(sentence).toHaveTextContent('Name is required.');
    expect(sentence).toHaveAttribute('data-reveal-sentence');
    expect(sentence).toHaveClass('text-sm', 'text-(--color-wrong)');
    expect(sentence.closest('[data-reveal-part]')).toBe(container.firstElementChild);
    expect(sentence.previousElementSibling).toBe(screen.getByRole('textbox', { name: 'Name' }));
  });

  it('draws an aside sentence muted and not as an alert', () => {
    render(
      <FormPart sentence="Give this practice a name to create it." look="aside">
        <input aria-label="Name" />
      </FormPart>,
    );

    const sentence = screen.getByText('Give this practice a name to create it.');
    expect(sentence).toHaveAttribute('data-reveal-sentence');
    expect(sentence).toHaveClass('text-sm', 'text-(--color-aside)');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps the sentence out of the name of a label among its children', () => {
    render(
      <FormPart sentence="Name is required." look="wrong">
        <label>
          Name
          <input />
        </label>
      </FormPart>,
    );

    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
  });
});
