// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardFieldsForm from 'src/components/library/CardFieldsForm';

describe('CardFieldsForm', () => {
  it('renders one labelled input per field, in the order given', () => {
    render(
      <CardFieldsForm
        fieldDefs={[
          { key: 'f1', name: 'Front', type: 'text' },
          { key: 'f2', name: 'Back', type: 'text' },
        ]}
        values={{ f1: 'Hola', f2: 'Hello' }}
        onChange={() => {}}
      />,
    );

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(2);
    expect(screen.getByRole('textbox', { name: 'Front' })).toHaveValue('Hola');
    expect(screen.getByRole('textbox', { name: 'Back' })).toHaveValue('Hello');
  });

  it('calls onChange with the field key and new value as the user types', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CardFieldsForm
        fieldDefs={[{ key: 'f1', name: 'Front', type: 'text' }]}
        values={{ f1: '' }}
        onChange={onChange}
      />,
    );

    await user.type(screen.getByRole('textbox', { name: 'Front' }), 'x');
    expect(onChange).toHaveBeenLastCalledWith('f1', 'x');
  });

  it('renders an unsupported field type read-only with a note, and does not crash', () => {
    render(
      <CardFieldsForm
        fieldDefs={[{ key: 'f1', name: 'Diagram', type: 'image' }]}
        values={{ f1: 'https://example.com/pic.png' }}
        onChange={() => {}}
      />,
    );

    const input = screen.getByRole('textbox', { name: /Diagram/ });
    expect(input).toHaveValue('https://example.com/pic.png');
    expect(input).toHaveAttribute('readonly');
    expect(screen.getByText('Unsupported field type')).toBeInTheDocument();
  });
});
