// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeckPicker from 'src/components/library/DeckPicker';

const decks = [
  { id: 'd1', name: 'Commands' },
  { id: 'd2', name: 'Ports' },
];

describe('DeckPicker', () => {
  it("as a form's picker, a row reads the deck's name alone, and the create row stays", async () => {
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

    const [commands, ports, create] = screen.getAllByRole('option');
    expect(commands).toHaveTextContent(/^Commands$/);
    expect(ports).toHaveTextContent(/^Ports$/);
    expect(create).toHaveTextContent(/^New deck…$/);

    await user.click(ports!);
    expect(onSelect).toHaveBeenCalledWith(decks[1]);
  });

  it("as a filter, a row reads the deck's name alone, and the clear row stays first", async () => {
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

    const [clear, commands, ports] = screen.getAllByRole('option');
    expect(clear).toHaveTextContent(/^All decks$/);
    expect(commands).toHaveTextContent(/^Commands$/);
    expect(ports).toHaveTextContent(/^Ports$/);
  });
});
