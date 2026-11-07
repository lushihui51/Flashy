// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

  it('renderBeneath draws under each row\'s name, not in the input', async () => {
    const user = userEvent.setup();
    render(
      <PickerCombobox
        items={items.slice(0, 2)}
        selected={items[0]!}
        onSelect={() => {}}
        onSelectCreate={() => {}}
        createLabel="New deck…"
        placeholder="Deck"
        renderBeneath={(item) => `beneath ${item.id}`}
      />,
    );
    expect(screen.queryByText('beneath d0')).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox'));
    const [first, second, createRow] = screen.getAllByRole('option');
    const name = within(first!).getByText('Deck 0');
    const beneath = within(first!).getByText('beneath d0');
    expect(name.compareDocumentPosition(beneath)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(within(second!).getByText('beneath d1')).toBeInTheDocument();
    expect(createRow).toHaveTextContent(/^New deck…$/);
    expect(screen.getByRole('combobox')).toHaveValue('Deck 0');
  });

  it('renderBeneath draws nothing on the locked chip', () => {
    render(
      <PickerCombobox
        items={items}
        selected={items[0]!}
        onSelect={() => {}}
        onSelectCreate={() => {}}
        createLabel="New deck…"
        placeholder="Deck"
        locked
        renderBeneath={(item) => `beneath ${item.id}`}
      />,
    );
    expect(screen.getByText('Deck 0')).toBeInTheDocument();
    expect(screen.queryByText('beneath d0')).not.toBeInTheDocument();
  });

  describe('while the list is open', () => {
    const renderPicker = () =>
      render(
        <PickerCombobox items={items} selected={null} onSelect={() => {}} onSelectCreate={() => {}} createLabel="New deck…" placeholder="Deck" />,
      );

    it('a pointerdown on the scrim closes the list and a button beside the picker is not clicked', async () => {
      const onBeside = vi.fn();
      const user = userEvent.setup();
      render(
        <>
          <PickerCombobox items={items} selected={null} onSelect={() => {}} onSelectCreate={() => {}} createLabel="New deck…" placeholder="Deck" />
          <button type="button" onClick={onBeside}>
            Beside
          </button>
        </>,
      );
      await user.click(screen.getByRole('combobox'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      fireEvent.pointerDown(screen.getByTestId('scrim'));

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(screen.queryByTestId('scrim')).not.toBeInTheDocument();
      expect(onBeside).not.toHaveBeenCalled();
    });

    it('typing narrows the options and the input keeps focus', async () => {
      const user = userEvent.setup();
      renderPicker();
      const input = screen.getByRole('combobox');
      await user.click(input);
      expect(screen.getAllByRole('option')).toHaveLength(9);

      await user.keyboard('Deck 10');

      expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Deck 10', 'New deck…']);
      expect(input).toHaveFocus();
    });

    it('the page cannot scroll until a choice closes the list', async () => {
      const user = userEvent.setup();
      document.documentElement.style.overflow = 'scroll';
      renderPicker();
      await user.click(screen.getByRole('combobox'));
      expect(document.documentElement.style.overflow).toBe('hidden');

      await user.click(screen.getByRole('option', { name: 'Deck 3' }));

      expect(document.documentElement.style.overflow).toBe('scroll');
      document.documentElement.style.overflow = '';
    });

    it('a focus moving outside closes the list, and a press on the input does not', async () => {
      const user = userEvent.setup();
      render(
        <>
          <PickerCombobox items={items} selected={null} onSelect={() => {}} onSelectCreate={() => {}} createLabel="New deck…" placeholder="Deck" />
          <button type="button">Next</button>
        </>,
      );
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByRole('combobox'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      await user.tab();

      expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('Escape closes the list and leaves focus in the input', async () => {
      const user = userEvent.setup();
      renderPicker();
      await user.click(screen.getByRole('combobox'));

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(screen.getByRole('combobox')).toHaveFocus();
    });

    it('marks the chosen row with a check, the clear row when a filter has nothing chosen', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <PickerCombobox purpose="filter" items={items} selected={null} onSelect={() => {}} clearLabel="All decks" onClear={() => {}} placeholder="Deck" />,
      );
      await user.click(screen.getByRole('combobox'));
      const checked = () =>
        screen.getAllByRole('option').filter((o) => o.querySelector('svg.lucide-check'));
      expect(checked().map((o) => o.textContent)).toEqual(['All decks']);

      rerender(
        <PickerCombobox purpose="filter" items={items} selected={items[2]!} onSelect={() => {}} clearLabel="All decks" onClear={() => {}} placeholder="Deck" />,
      );
      expect(checked().map((o) => o.textContent)).toEqual(['Deck 2']);
    });

    it('the control reads as open: ink outline, and a chevron pointing up', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <PickerCombobox purpose="filter" items={items} selected={null} onSelect={() => {}} clearLabel="All decks" onClear={() => {}} placeholder="Deck" />,
      );
      const input = screen.getByRole('combobox');
      expect(input).toHaveClass('outlined-line');

      await user.click(input);

      expect(input).toHaveClass('outlined-ink');
      expect(container.querySelector('svg.lucide-chevron-up')).not.toBeNull();
      expect(container.querySelector('svg.lucide-chevron-down')).toBeNull();
    });
  });

  describe('purpose="filter"', () => {
    it('draws a chevron with no hard-coded top', () => {
      const { container } = render(
        <PickerCombobox
          purpose="filter"
          items={items}
          selected={null}
          onSelect={() => {}}
          clearLabel="All decks"
          onClear={() => {}}
          placeholder="Deck"
        />,
      );

      const chevron = container.querySelector('svg.lucide-chevron-down');
      expect(chevron).not.toBeNull();
      expect(chevron?.getAttribute('class')).not.toContain('top-[');
    });

    it('offers a clear row first, and no create row', async () => {
      const user = userEvent.setup();
      render(
        <PickerCombobox
          purpose="filter"
          items={items.slice(0, 3)}
          selected={null}
          onSelect={() => {}}
          clearLabel="All decks"
          onClear={() => {}}
          placeholder="Deck"
        />,
      );
      await user.click(screen.getByRole('combobox'));

      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveTextContent('All decks');
      expect(options).toHaveLength(4); // clear + 3 items, no create row
      expect(screen.queryByRole('option', { name: /New/ })).not.toBeInTheDocument();
    });

    it('choosing the clear row calls onClear and empties the input', async () => {
      const onClear = vi.fn();
      const onSelect = vi.fn();
      const user = userEvent.setup();
      render(
        <PickerCombobox
          purpose="filter"
          items={items}
          selected={items[3]!}
          onSelect={onSelect}
          clearLabel="All decks"
          onClear={onClear}
          placeholder="Deck"
        />,
      );
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'All decks' }));

      expect(onClear).toHaveBeenCalledTimes(1);
      expect(onSelect).not.toHaveBeenCalled();
      expect(screen.getByRole('combobox')).toHaveValue('');
    });

    it('selecting an item still reports the item, not the row above it', async () => {
      const onSelect = vi.fn();
      const user = userEvent.setup();
      render(
        <PickerCombobox
          purpose="filter"
          items={items}
          selected={null}
          onSelect={onSelect}
          clearLabel="All decks"
          onClear={() => {}}
          placeholder="Deck"
        />,
      );
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: 'Deck 2' }));

      expect(onSelect).toHaveBeenCalledWith(items[2]);
    });

    it('the clear row is the first keyboard stop, ahead of the items', async () => {
      const onClear = vi.fn();
      const user = userEvent.setup();
      render(
        <PickerCombobox
          purpose="filter"
          items={items}
          selected={null}
          onSelect={() => {}}
          clearLabel="All decks"
          onClear={onClear}
          placeholder="Deck"
        />,
      );
      await user.click(screen.getByRole('combobox'));
      await user.keyboard('{Enter}');

      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });
});
