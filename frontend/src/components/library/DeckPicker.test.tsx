// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeckPicker from 'src/components/library/DeckPicker';

const decks = [
  { id: 'd1', name: 'Commands' },
  { id: 'd2', name: 'Ports' },
];

function expectMarkBeforeName(option: HTMLElement, name: string) {
  expect(option).toHaveAccessibleName(`Deck ${name}`);
  const mark = within(option).getByRole('img', { name: 'Deck' });
  expect(
    mark.compareDocumentPosition(within(option).getByText(name)) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
}

describe('DeckPicker', () => {
  it("as a form's picker, a row shows the deck's mark before the deck's name, and the create row stays", async () => {
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
    expectMarkBeforeName(commands!, 'Commands');
    expectMarkBeforeName(ports!, 'Ports');
    expect(within(create!).queryByRole('img', { name: 'Deck' })).not.toBeInTheDocument();

    await user.click(ports!);
    expect(onSelect).toHaveBeenCalledWith(decks[1]);
  });

  it("as a filter, a row shows the deck's mark before the deck's name, and the clear row stays first", async () => {
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
    expectMarkBeforeName(commands!, 'Commands');
    expectMarkBeforeName(ports!, 'Ports');
    expect(within(clear!).queryByRole('img', { name: 'Deck' })).not.toBeInTheDocument();
  });

  it('passes the input and list labels and clearOnPick on', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <DeckPicker
        items={decks}
        selected={null}
        onSelect={onSelect}
        onSelectCreate={() => {}}
        createLabel="New deck…"
        placeholder="Search decks"
        inputLabel="Search decks"
        listLabel="Decks"
        clearOnPick
      />,
    );
    const input = screen.getByRole('combobox', { name: 'Search decks' });
    await user.click(input);

    await user.click(
      within(screen.getByRole('listbox', { name: 'Decks' })).getByRole('option', {
        name: 'Deck Ports',
      }),
    );

    expect(onSelect).toHaveBeenCalledWith(decks[1]);
    expect(input).toHaveValue('');
  });
});
