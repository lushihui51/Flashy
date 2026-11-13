// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RunRow from 'src/components/run/RunRow';
import type { components } from 'src/api/types';

type RunListing = components['schemas']['RunListing'];

function listing(overrides: Partial<RunListing> = {}): RunListing {
  return {
    id: 'r1',
    practice_id: 'p1',
    status: 'completed',
    day: '2026-11-07',
    day_index: 1,
    created_at: '2026-11-07T18:00:00Z',
    last_activity_at: '2026-11-07T18:00:00Z',
    reached_cards: 12,
    counted_cards: 74,
    ...overrides,
  };
}

function renderRow(run: RunListing) {
  render(
    <MemoryRouter>
      <RunRow run={run} />
    </MemoryRouter>,
  );
  return screen.getByRole('link');
}

describe('RunRow', () => {
  it("is the run's mark and day, its badge and its count, opening the run", () => {
    const row = renderRow(listing());

    expect(row).toHaveAttribute('href', '/runs/r1');
    expect(within(row).getByRole('img', { name: 'Run' })).toBeInTheDocument();
    expect(row).toHaveTextContent('2026-11-07 (1)Completed12 of 74 cards');
  });

  it('reads Active for an active run', () => {
    const row = renderRow(listing({ status: 'active', day_index: 0, reached_cards: 0 }));

    expect(row).toHaveTextContent('2026-11-07Active0 of 74 cards');
  });

  it('says card for a count of one', () => {
    const row = renderRow(listing({ reached_cards: 1, counted_cards: 1 }));

    expect(row).toHaveTextContent('1 of 1 card');
  });
});
