// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeckPicker from 'src/components/library/DeckPicker';

const decks = [
  { id: 'd1', name: 'Commands', subject_name: 'Linux' },
  { id: 'd2', name: 'Commands', subject_name: 'Windows' },
];

describe('DeckPicker', () => {
  it("as a form's picker, a row reads the deck's name with its subject beneath, and the create row stays", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <DeckPicker
        items={decks}
        selected={null}
        onSelect={onSelect}
        onSelectCreate={() => {}}
        createLabel="New deck…"
        placeholder="Deck"
      />,
    );
    await user.click(screen.getByRole('combobox'));

    const [linux, windows, create] = screen.getAllByRole('option');
    expect(within(linux!).getByText('Commands')).toBeInTheDocument();
    expect(within(linux!).getByText('Linux')).toBeInTheDocument();
    expect(within(windows!).getByText('Commands')).toBeInTheDocument();
    expect(within(windows!).getByText('Windows')).toBeInTheDocument();
    expect(create).toHaveTextContent(/^New deck…$/);

    await user.click(windows!);
    expect(onSelect).toHaveBeenCalledWith(decks[1]);
  });

  it("as a filter, a row reads the deck's name with its subject beneath, and the clear row stays first", async () => {
    const user = userEvent.setup();
    render(
      <DeckPicker
        purpose="filter"
        items={decks}
        selected={null}
        onSelect={() => {}}
        clearLabel="All decks"
        onClear={() => {}}
        placeholder="All decks"
      />,
    );
    await user.click(screen.getByRole('combobox'));

    const [clear, linux, windows] = screen.getAllByRole('option');
    expect(clear).toHaveTextContent(/^All decks$/);
    expect(within(linux!).getByText('Linux')).toBeInTheDocument();
    expect(within(windows!).getByText('Windows')).toBeInTheDocument();
  });
});
