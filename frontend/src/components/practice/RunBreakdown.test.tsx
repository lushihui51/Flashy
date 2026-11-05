// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RunBreakdown from 'src/components/practice/RunBreakdown';
import type { components } from 'src/api/types';

type PracticeRunBreakdown = components['schemas']['PracticeRunBreakdown'];

// Deltas are distinct across every card, and cover all three sign cases (+5, −10, ±0,
// +20) so a single fixture can drive every ordering/formatting test.
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
        readiness: 0.7,
        delta: 0.05,
        fields: [
          { field_def_id: 'front1', name: 'Front', type: 'text', readiness: 0.65, delta: 0.05 },
          { field_def_id: 'back1', name: 'Back', type: 'text', readiness: 0.75, delta: 0.05 },
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
        readiness: 0.4,
        delta: -0.1,
        // Named distinctly from the attempts section's own "Front"/"Back" labels so
        // this card's Fields section entries don't collide with those assertions.
        fields: [
          { field_def_id: 'notes2', name: 'Notes', type: 'text', readiness: 0.4, delta: -0.1 },
          // Never reviewed by anyone — the sheet's Fields section reads 0.
          { field_def_id: 'filler2', name: 'Filler', type: 'text', readiness: 0, delta: 0 },
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
        readiness: 0.5,
        delta: 0,
        fields: [{ field_def_id: 'front3', name: 'Front', type: 'text', readiness: 0.5, delta: 0 }],
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
        readiness: 0.6,
        delta: 0.2,
        fields: [{ field_def_id: 'front4', name: 'Front', type: 'text', readiness: 0.6, delta: 0.2 }],
      },
    ],
    ...overrides,
  };
}

/** The row buttons' accessible names include the badge, circle and delta text alongside
 * the title (they're all inside the same <button>), so these tests match on the
 * title substring rather than the exact name. */
function rowTitles() {
  return screen
    .getAllByRole('button', { name: /Bonjour|Bonsoir|Adieu|Untitled card/ })
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

    // Readiness: card2 0.4, card3 0.5, card4 0.6, card1 0.7.
    const titles = rowTitles();
    expect(titles[0]).toContain('Bonsoir');
    expect(titles[1]).toContain('Untitled card');
    expect(titles[2]).toContain('Adieu');
    expect(titles[3]).toContain('Bonjour');
  });

  it("a row shows its first field's value alone, never the field's name", () => {
    render(<RunBreakdown breakdown={breakdown()} />);

    expect(screen.getByText('Bonjour')).toBeInTheDocument();
    expect(screen.queryByText('Front: Bonjour')).not.toBeInTheDocument();
    expect(screen.queryByText(/Front/)).not.toBeInTheDocument();
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('shows "Untitled card" for a card whose primary field is blank', () => {
    render(<RunBreakdown breakdown={breakdown()} />);
    expect(screen.getByRole('button', { name: /Untitled card/ })).toBeInTheDocument();
  });

  it('a row shows its outcome badge, its mastery circle with no number, and its delta', () => {
    render(<RunBreakdown breakdown={breakdown()} />);

    const row = screen.getByRole('button', { name: /Bonjour/ });
    expect(within(row).getByText('First try')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /Adieu/ })).getByText('Failed')).toBeInTheDocument();
    expect(within(row).getByRole('img', { name: 'Mastery 70%' })).toBeInTheDocument();
    expect(within(row).queryByText('70')).not.toBeInTheDocument();
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
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Bonsoir' })).toBeInTheDocument();
    expect(within(dialog).getByText('Attempt 1 of 2 · Failed')).toBeInTheDocument();
    expect(within(dialog).getByText('Attempt 2 of 2 · Passed')).toBeInTheDocument();
    // The prompt/answer field names and values are labeled once per attempt; the
    // prompt's value also heads the sheet.
    expect(within(dialog).getAllByText('Front')).toHaveLength(2);
    expect(within(dialog).getAllByText('Bonsoir')).toHaveLength(3);
    expect(within(dialog).getAllByText('Back')).toHaveLength(2);
    expect(within(dialog).getAllByText('Good evening')).toHaveLength(2);
    // The first attempt's answer was rated 1 ("Again"), the second 3 ("Good").
    expect(within(dialog).getByText('Again')).toBeInTheDocument();
    expect(within(dialog).getByText('Good')).toBeInTheDocument();

    // Fields section: every active field, including one never reviewed by anyone.
    expect(within(dialog).getByText('Fields')).toBeInTheDocument();
    expect(within(dialog).getByText('Filler')).toBeInTheDocument();
    const notes = within(dialog).getByText('Notes').closest('li')!;
    expect(within(notes).getByRole('img', { name: 'Mastery 40%' })).toBeInTheDocument();
    expect(within(notes).queryByText('40')).not.toBeInTheDocument();
    const filler = within(dialog).getByText('Filler').closest('li')!;
    expect(within(filler).getByRole('img', { name: 'Mastery 0%' })).toBeInTheDocument();
    expect(within(filler).getByText('±0')).toBeInTheDocument();
  });

  it('shows no attempt header for a single-attempt card', async () => {
    const user = userEvent.setup();
    render(<RunBreakdown breakdown={breakdown()} />);

    await user.click(screen.getByRole('button', { name: /Bonjour/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByText(/Attempt 1/)).not.toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { level: 2, name: 'Bonjour' })).toBeInTheDocument();
    expect(within(dialog).getAllByText('Bonjour')).toHaveLength(2);
    expect(within(dialog).getByText('Easy')).toBeInTheDocument();
  });
});
