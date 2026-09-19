// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RunBreakdown from 'src/components/practice/RunBreakdown';
import type { components } from 'src/api/types';

type PracticeRunBreakdown = components['schemas']['PracticeRunBreakdown'];

// Deltas are distinct across every card, and cover all three MD-2 sign cases
// (+5, −10, ±0, +20) so a single fixture can drive every ordering/formatting test.
function breakdown(overrides: Partial<PracticeRunBreakdown> = {}): PracticeRunBreakdown {
  return {
    total_cards: 4,
    passed_first_try: 1,
    passed_after_one_fail: 1,
    passed_after_many_fails: 1,
    still_failed: 1,
    cards: [
      {
        card_id: 'card1',
        bucket: 'passed_first_try',
        attempt_count: 1,
        primary_field: { field_def_id: 'front1', name: 'Front', type: 'text', value: 'Bonjour' },
        attempts: [
          {
            practice_card_id: 'pc1',
            status: 'passed',
            created_at: '2026-01-01T00:00:00Z',
            prompts: [{ field_def_id: 'front1', name: 'Front', type: 'text', value: 'Bonjour' }],
            answers: [
              { field_def_id: 'back1', name: 'Back', type: 'text', value: 'Hello', rating: 4 },
            ],
          },
        ],
        mastery: 70,
        delta: 5,
        fields: [
          { field_def_id: 'front1', name: 'Front', type: 'text', mastery: 65, delta: 5 },
          { field_def_id: 'back1', name: 'Back', type: 'text', mastery: 75, delta: 5 },
        ],
      },
      {
        card_id: 'card2',
        bucket: 'passed_after_one_fail',
        attempt_count: 2,
        primary_field: { field_def_id: 'front2', name: 'Front', type: 'text', value: 'Bonsoir' },
        attempts: [
          {
            practice_card_id: 'pc2a',
            status: 'failed',
            created_at: '2026-01-01T00:00:00Z',
            prompts: [{ field_def_id: 'front2', name: 'Front', type: 'text', value: 'Bonsoir' }],
            answers: [
              {
                field_def_id: 'back2',
                name: 'Back',
                type: 'text',
                value: 'Good evening',
                rating: 1,
              },
            ],
          },
          {
            practice_card_id: 'pc2b',
            status: 'passed',
            created_at: '2026-01-02T00:00:00Z',
            prompts: [{ field_def_id: 'front2', name: 'Front', type: 'text', value: 'Bonsoir' }],
            answers: [
              {
                field_def_id: 'back2',
                name: 'Back',
                type: 'text',
                value: 'Good evening',
                rating: 3,
              },
            ],
          },
        ],
        mastery: 40,
        delta: -10,
        // Named distinctly from the attempts section's own "Front"/"Back" labels so
        // this card's Fields section entries don't collide with those assertions.
        fields: [
          { field_def_id: 'notes2', name: 'Notes', type: 'text', mastery: 40, delta: -10 },
          // Never reviewed by anyone — the sheet's Fields section renders "—", not 0.
          { field_def_id: 'filler2', name: 'Filler', type: 'text', mastery: null, delta: 0 },
        ],
      },
      {
        card_id: 'card3',
        bucket: 'passed_after_many_fails',
        attempt_count: 1,
        // A blank primary field — triggers the "Untitled card" fallback copy.
        primary_field: { field_def_id: 'front3', name: 'Front', type: 'text', value: '' },
        attempts: [
          {
            practice_card_id: 'pc3',
            status: 'passed',
            created_at: '2026-01-03T00:00:00Z',
            prompts: [{ field_def_id: 'front3', name: 'Front', type: 'text', value: '' }],
            answers: [
              { field_def_id: 'back3', name: 'Back', type: 'text', value: 'Whatever', rating: 2 },
            ],
          },
        ],
        mastery: 50,
        delta: 0,
        fields: [{ field_def_id: 'front3', name: 'Front', type: 'text', mastery: 50, delta: 0 }],
      },
      {
        card_id: 'card4',
        bucket: 'still_failed',
        attempt_count: 1,
        primary_field: { field_def_id: 'front4', name: 'Front', type: 'text', value: 'Adieu' },
        attempts: [
          {
            practice_card_id: 'pc4',
            status: 'failed',
            created_at: '2026-01-01T00:00:00Z',
            prompts: [{ field_def_id: 'front4', name: 'Front', type: 'text', value: 'Adieu' }],
            answers: [
              { field_def_id: 'back4', name: 'Back', type: 'text', value: 'Farewell', rating: 1 },
            ],
          },
        ],
        mastery: 60,
        delta: 20,
        fields: [{ field_def_id: 'front4', name: 'Front', type: 'text', mastery: 60, delta: 20 }],
      },
    ],
    ...overrides,
  };
}

/** The row buttons' accessible names include the badge/mastery/delta text alongside
 * the title (they're all inside the same <button>), so these tests match on the
 * title substring rather than the exact name. */
function rowTitles() {
  return screen
    .getAllByRole('button', { name: /Front:|Untitled card/ })
    .map((el) => el.textContent);
}

describe('RunBreakdown', () => {
  it('shows the counts line', () => {
    render(<RunBreakdown breakdown={breakdown()} />);
    expect(screen.getByText('4 cards practiced')).toBeInTheDocument();
  });

  it('defaults to delta descending (Gains first)', () => {
    render(<RunBreakdown breakdown={breakdown()} />);

    expect(screen.getByRole('radio', { name: 'Gains first' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    // Deltas: card4 +20, card1 +5, card3 ±0, card2 −10.
    const titles = rowTitles();
    expect(titles[0]).toContain('Adieu');
    expect(titles[1]).toContain('Bonjour');
    expect(titles[2]).toContain('Untitled card');
    expect(titles[3]).toContain('Bonsoir');
  });

  it('Drops first sorts delta ascending', async () => {
    const user = userEvent.setup();
    render(<RunBreakdown breakdown={breakdown()} />);

    await user.click(screen.getByRole('radio', { name: 'Drops first' }));

    const titles = rowTitles();
    expect(titles[0]).toContain('Bonsoir'); // −10
    expect(titles[1]).toContain('Untitled card'); // ±0
    expect(titles[2]).toContain('Bonjour'); // +5
    expect(titles[3]).toContain('Adieu'); // +20
  });

  it('Mastery sorts ascending — weakest first', async () => {
    const user = userEvent.setup();
    render(<RunBreakdown breakdown={breakdown()} />);

    await user.click(screen.getByRole('radio', { name: 'Mastery' }));

    // Masteries: card2 40, card3 50, card4 60, card1 70.
    const titles = rowTitles();
    expect(titles[0]).toContain('Bonsoir');
    expect(titles[1]).toContain('Untitled card');
    expect(titles[2]).toContain('Adieu');
    expect(titles[3]).toContain('Bonjour');
  });

  it("a row shows only the primary field's name and value, not prompt/answer content", () => {
    render(<RunBreakdown breakdown={breakdown()} />);

    expect(screen.getByText('Front: Bonjour')).toBeInTheDocument();
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('shows "Untitled card" for a card whose primary field is blank', () => {
    render(<RunBreakdown breakdown={breakdown()} />);
    expect(screen.getByRole('button', { name: /Untitled card/ })).toBeInTheDocument();
  });

  it('a row shows its outcome badge, rounded mastery, and delta rendering', () => {
    render(<RunBreakdown breakdown={breakdown()} />);

    const row = screen.getByRole('button', { name: /Bonjour/ });
    expect(within(row).getByText('First try')).toBeInTheDocument();
    expect(within(row).getByText('70')).toBeInTheDocument();
    expect(within(row).getByText('+5')).toBeInTheDocument();

    // One case each of the other two signs, from the other rows.
    expect(
      within(screen.getByRole('button', { name: /Bonsoir/ })).getByText('−10'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('button', { name: /Untitled card/ })).getByText('±0'),
    ).toBeInTheDocument();
  });

  it('opens the detail sheet with labels, ratings, every attempt, and the Fields section for a two-attempt card', async () => {
    const user = userEvent.setup();
    render(<RunBreakdown breakdown={breakdown()} />);

    await user.click(screen.getByRole('button', { name: /Bonsoir/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Attempt 1 of 2 · Failed')).toBeInTheDocument();
    expect(within(dialog).getByText('Attempt 2 of 2 · Passed')).toBeInTheDocument();
    // The prompt/answer field names and values are labeled once per attempt.
    expect(within(dialog).getAllByText('Front')).toHaveLength(2);
    expect(within(dialog).getAllByText('Bonsoir')).toHaveLength(2);
    expect(within(dialog).getAllByText('Back')).toHaveLength(2);
    expect(within(dialog).getAllByText('Good evening')).toHaveLength(2);
    // The first attempt's answer was rated 1 ("Again"), the second 3 ("Good").
    expect(within(dialog).getByText('Again')).toBeInTheDocument();
    expect(within(dialog).getByText('Good')).toBeInTheDocument();

    // Fields section: every active field, including one never reviewed by anyone.
    expect(within(dialog).getByText('Fields')).toBeInTheDocument();
    expect(within(dialog).getByText('Filler')).toBeInTheDocument();
    expect(within(dialog).getByText('—')).toBeInTheDocument();
  });

  it('shows no attempt header for a single-attempt card', async () => {
    const user = userEvent.setup();
    render(<RunBreakdown breakdown={breakdown()} />);

    await user.click(screen.getByRole('button', { name: /Bonjour/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByText(/Attempt 1/)).not.toBeInTheDocument();
    expect(within(dialog).getByText('Bonjour')).toBeInTheDocument();
    expect(within(dialog).getByText('Easy')).toBeInTheDocument();
  });
});
