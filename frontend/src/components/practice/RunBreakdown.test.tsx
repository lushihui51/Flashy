// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import RunBreakdown from 'src/components/practice/RunBreakdown';
import { renderWithProviders } from 'src/test/testUtils';
import type { components } from 'src/api/types';

type PracticeRunBreakdown = components['schemas']['PracticeRunBreakdown'];
type BreakdownCard = components['schemas']['BreakdownCard'];

function card(
  id: string,
  name: string,
  readiness: number,
  delta: number,
  change: BreakdownCard['change'],
): BreakdownCard {
  return {
    card_id: id,
    primary_field: { field_def_id: `front-${id}`, name: 'Front', type: 'text', value: name },
    readiness,
    delta,
    change,
    fields: [],
    attempts: [],
  };
}

// Readiness and delta order the cards differently, and every kind but up a lot has a card.
function breakdown(): PracticeRunBreakdown {
  return {
    total_cards: 5,
    cards: [
      card('c1', 'Bonjour', 0.7, 0.2, 'up'),
      card('c2', 'Bonsoir', 0.2, -0.3, 'down_a_lot'),
      card('c3', '', 0.5, 0, 'no_change'),
      card('c4', 'Adieu', 0.6, -0.1, 'down'),
      card('c5', 'Salut', 0.9, 0.2, 'up'),
    ],
  };
}

function LocationProbe() {
  const { search } = useLocation();
  return <div data-testid="search">{search}</div>;
}

function renderBreakdown(entry = '/') {
  return renderWithProviders(
    <>
      <RunBreakdown breakdown={breakdown()} />
      <LocationProbe />
    </>,
    [entry],
  );
}

function rowNames() {
  return within(screen.getByRole('list'))
    .queryAllByRole('button')
    .map((row) => row.textContent);
}

describe('RunBreakdown', () => {
  it('orders by readiness ascending by default, with Mastery pressed in', () => {
    renderBreakdown();

    expect(screen.getByRole('radiogroup', { name: 'Order by' })).toHaveTextContent('Order by:');
    expect(screen.getByRole('radio', { name: 'Mastery' })).toHaveAttribute('aria-checked', 'true');
    expect(rowNames()).toEqual(['Bonsoir', 'Untitled card', 'Adieu', 'Bonjour', 'Salut']);
  });

  it('Gains orders by delta descending, ties keeping the payload order', async () => {
    const user = userEvent.setup();
    renderBreakdown();

    await user.click(screen.getByRole('radio', { name: 'Gains' }));

    expect(rowNames()).toEqual(['Bonjour', 'Salut', 'Untitled card', 'Adieu', 'Bonsoir']);
    expect(screen.getByRole('radio', { name: 'Gains' })).toHaveAttribute('aria-checked', 'true');
  });

  it('Drops orders by delta ascending', async () => {
    const user = userEvent.setup();
    renderBreakdown();

    await user.click(screen.getByRole('radio', { name: 'Drops' }));

    expect(rowNames()).toEqual(['Bonsoir', 'Adieu', 'Untitled card', 'Bonjour', 'Salut']);
  });

  it('choosing an order writes it to the URL, and Mastery removes it', async () => {
    const user = userEvent.setup();
    renderBreakdown();

    await user.click(screen.getByRole('radio', { name: 'Drops' }));
    expect(screen.getByTestId('search')).toHaveTextContent('?order=drops');

    await user.click(screen.getByRole('radio', { name: 'Mastery' }));
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
  });

  it('the five counts speak their count and word in order, and show the number', () => {
    renderBreakdown();

    const counts = within(screen.getByRole('group')).getAllByRole('button');
    expect(counts.map((count) => count.getAttribute('aria-label'))).toEqual([
      '0 up a lot',
      '2 up',
      '1 no change',
      '1 down',
      '1 down a lot',
    ]);
    expect(counts.map((count) => count.textContent)).toEqual(['0', '2', '1', '1', '1']);
    expect(counts.every((count) => count.getAttribute('aria-pressed') === 'false')).toBe(true);
    expect(counts.every((count) => count.querySelector('svg'))).toBe(true);
  });

  it('choosing two counts narrows to their cards, writes kind twice, and leaves the counts', async () => {
    const user = userEvent.setup();
    renderBreakdown();

    await user.click(screen.getByRole('button', { name: '1 down' }));
    await user.click(screen.getByRole('button', { name: '1 down a lot' }));

    expect(rowNames()).toEqual(['Bonsoir', 'Adieu']);
    expect(screen.getByTestId('search')).toHaveTextContent('?kind=down&kind=down_a_lot');
    expect(screen.getByRole('button', { name: '1 down' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '2 up' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('tapping a chosen count again shows every card', async () => {
    const user = userEvent.setup();
    renderBreakdown('/?kind=down');

    await user.click(screen.getByRole('button', { name: '1 down' }));

    expect(rowNames()).toHaveLength(5);
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
  });

  it('a count of zero stays pressable and narrows to an empty list with no sentence', async () => {
    const user = userEvent.setup();
    renderBreakdown();

    await user.click(screen.getByRole('button', { name: '0 up a lot' }));

    expect(screen.getByRole('button', { name: '0 up a lot' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const list = screen.getByRole('list');
    expect(list).toBeEmptyDOMElement();
    expect(list.parentElement!.lastElementChild).toBe(list);
  });

  it('a kind in the URL on first render already narrows', () => {
    renderBreakdown('/?kind=up');

    expect(rowNames()).toEqual(['Bonjour', 'Salut']);
    expect(screen.getByRole('button', { name: '2 up' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('a kind or order the lists do not hold reads as absent', () => {
    renderBreakdown('/?kind=sideways&order=loudest');

    expect(rowNames()).toEqual(['Bonsoir', 'Untitled card', 'Adieu', 'Bonjour', 'Salut']);
    expect(screen.getByRole('radio', { name: 'Mastery' })).toHaveAttribute('aria-checked', 'true');
  });

  it('a row speaks its mastery and change, and shows no number or outcome', () => {
    renderBreakdown();

    const row = screen.getByRole('button', { name: /Bonsoir/ });
    expect(within(row).getByRole('img', { name: 'Mastery 20%, down a lot' })).toBeInTheDocument();
    expect(row.textContent).toBe('Bonsoir');

    const words = within(screen.getByRole('list')).getByText('Bonjour').closest('ul')!.textContent!;
    for (const forbidden of ['+', '−', '±', 'First try', 'Attempt']) {
      expect(words).not.toContain(forbidden);
    }
  });

  it('a card whose first field is blank reads "Untitled card"', () => {
    renderBreakdown();

    expect(screen.getByRole('button', { name: /Untitled card/ })).toBeInTheDocument();
  });
});
