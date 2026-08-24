// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardForm from 'src/components/library/CardForm';

const fieldDefs = [
  { key: 'f1', name: 'Front', type: 'text' },
  { key: 'f2', name: 'Back', type: 'text' },
];

describe('CardForm — in-editor role', () => {
  it('renders nothing when closed', () => {
    render(
      <CardForm
        open={false}
        fieldDefs={fieldDefs}
        initialValues={{}}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('"Add card" mode has no Delete action, and Save reports the typed values', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <CardForm open fieldDefs={fieldDefs} initialValues={{}} onSave={onSave} onClose={() => {}} />,
    );

    expect(screen.getByRole('heading', { name: 'Add card' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete card' })).not.toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Front' }), 'Hola');
    await user.click(screen.getByRole('button', { name: 'Add card' }));

    expect(onSave).toHaveBeenCalledWith({ f1: 'Hola' });
  });

  it('reopening with initialValues prefills the fields, and offers Delete', () => {
    render(
      <CardForm
        open
        fieldDefs={fieldDefs}
        initialValues={{ f1: 'Hola', f2: 'Hello' }}
        onSave={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Edit card' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Front' })).toHaveValue('Hola');
    expect(screen.getByRole('textbox', { name: 'Back' })).toHaveValue('Hello');
    expect(screen.getByRole('button', { name: 'Delete card' })).toBeInTheDocument();
  });

  it('Delete calls onDelete', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(
      <CardForm
        open
        fieldDefs={fieldDefs}
        initialValues={{ f1: 'Hola' }}
        onSave={() => {}}
        onDelete={onDelete}
        onClose={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Delete card' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('Cancel calls onClose without saving', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <CardForm open fieldDefs={fieldDefs} initialValues={{}} onSave={onSave} onClose={onClose} />,
    );

    await user.type(screen.getByRole('textbox', { name: 'Front' }), 'typed but abandoned');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('reopening with a fresh key (the caller\'s remount contract) shows that card\'s own values, not the last one\'s', () => {
    const { rerender } = render(
      <CardForm
        key="a"
        open
        fieldDefs={fieldDefs}
        initialValues={{ f1: 'Card A' }}
        onSave={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Front' })).toHaveValue('Card A');

    rerender(
      <CardForm
        key="b"
        open
        fieldDefs={fieldDefs}
        initialValues={{ f1: 'Card B' }}
        onSave={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Front' })).toHaveValue('Card B');
  });

  it('re-rendering with the same key (no new open) keeps local edits, even if initialValues is a new object reference', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <CardForm
        key="same"
        open
        fieldDefs={fieldDefs}
        initialValues={{ f1: '' }}
        onSave={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );
    await user.type(screen.getByRole('textbox', { name: 'Front' }), 'typed locally');

    // Same key, but a brand-new `{ f1: '' }` object — this is exactly the shape of
    // the bug this component's docstring warns callers about (a fresh reference for
    // "no card selected" on every parent render). It must not wipe what's typed.
    rerender(
      <CardForm
        key="same"
        open
        fieldDefs={fieldDefs}
        initialValues={{ f1: '' }}
        onSave={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Front' })).toHaveValue('typed locally');
  });
});
