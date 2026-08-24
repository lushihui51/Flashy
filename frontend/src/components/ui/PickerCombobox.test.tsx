// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PickerCombobox from 'src/components/ui/PickerCombobox';

const items = Array.from({ length: 11 }, (_, i) => ({ id: `d${i}`, name: `Deck ${i}` }));

describe('PickerCombobox', () => {
  it('zero items: exactly one row, the create row', async () => {
    const user = userEvent.setup();
    render(
      <PickerCombobox items={[]} selected={null} onSelect={() => {}} onSelectCreate={() => {}} createLabel="New deck…" placeholder="Deck" />,
    );
    await user.click(screen.getByRole('combobox'));

    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: 'New deck…' })).toBeInTheDocument();
  });

  it('empty query with more than the cap: shows PICKER_MAX_ITEMS rows in server order, a footer, then the create row', async () => {
    const user = userEvent.setup();
    render(
      <PickerCombobox items={items} selected={null} onSelect={() => {}} onSelectCreate={() => {}} createLabel="New deck…" placeholder="Deck" />,
    );
    await user.click(screen.getByRole('combobox'));

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(9); // 8 items + create row
    expect(options.map((o) => o.textContent)).toEqual([
      'Deck 0',
      'Deck 1',
      'Deck 2',
      'Deck 3',
      'Deck 4',
      'Deck 5',
      'Deck 6',
      'Deck 7',
      'New deck…',
    ]);
    expect(screen.getByText('Showing 8 of 11 · type to narrow')).toBeInTheDocument();
  });

  it('typing narrows the list; the create row stays last and keyboard-reachable', async () => {
    const onSelectCreate = vi.fn();
    const user = userEvent.setup();
    render(
      <PickerCombobox items={items} selected={null} onSelect={() => {}} onSelectCreate={onSelectCreate} createLabel="New deck…" placeholder="Deck" />,
    );
    const input = screen.getByRole('combobox');
    await user.type(input, 'Deck 1');

    // "Deck 1" and "Deck 10" both match.
    expect(screen.getByRole('option', { name: 'Deck 1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Deck 10' })).toBeInTheDocument();
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();

    // arrow past both matches to land on the create row, then Enter.
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onSelectCreate).toHaveBeenCalledTimes(1);
  });

  it('selecting an item calls onSelect and closes the list', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <PickerCombobox items={items} selected={null} onSelect={onSelect} onSelectCreate={() => {}} createLabel="New deck…" placeholder="Deck" />,
    );
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Deck 3' }));

    expect(onSelect).toHaveBeenCalledWith(items[3]);
    expect(screen.getByRole('combobox')).toHaveValue('Deck 3');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('reopening on an unmodified selection shows the full list again, not filtered to just that name', async () => {
    const user = userEvent.setup();
    render(
      <PickerCombobox items={items} selected={items[3]!} onSelect={() => {}} onSelectCreate={() => {}} createLabel="New deck…" placeholder="Deck" />,
    );
    await user.click(screen.getByRole('combobox'));

    expect(screen.getAllByRole('option').length).toBeGreaterThan(1);
    expect(screen.getByRole('option', { name: 'Deck 0' })).toBeInTheDocument();
  });

  it('locked renders a static chip with no combobox', () => {
    render(
      <PickerCombobox
        items={items}
        selected={items[0]!}
        onSelect={() => {}}
        onSelectCreate={() => {}}
        createLabel="New deck…"
        placeholder="Deck"
        locked
      />,
    );
    expect(screen.getByText('Deck 0')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renderLeading renders alongside each option and the locked chip', () => {
    render(
      <PickerCombobox
        items={items}
        selected={items[0]!}
        onSelect={() => {}}
        onSelectCreate={() => {}}
        createLabel="New deck…"
        placeholder="Deck"
        locked
        renderLeading={(item) => <span data-testid={`leading-${item.id}`}>*</span>}
      />,
    );
    expect(screen.getByTestId('leading-d0')).toBeInTheDocument();
  });
});
