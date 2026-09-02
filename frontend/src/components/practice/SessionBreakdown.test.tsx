// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionBreakdown from 'src/components/practice/SessionBreakdown';
import type { components } from 'src/api/types';

type PracticeSessionBreakdown = components['schemas']['PracticeSessionBreakdown'];

function breakdown(overrides: Partial<PracticeSessionBreakdown> = {}): PracticeSessionBreakdown {
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
      },
      {
        card_id: 'card3',
        bucket: 'passed_after_many_fails',
        attempt_count: 1,
        // A blank primary field — CardSummaryRow.tsx's "Untitled card" fallback copy.
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
      },
    ],
    ...overrides,
  };
}

describe('SessionBreakdown', () => {
  it('shows all four bucket tabs, each with its count', () => {
    render(<SessionBreakdown breakdown={breakdown()} />);

    expect(screen.getByRole('tab', { name: 'First try (1)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'One retry (1)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '2+ retries (1)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Abandoned (1)' })).toBeInTheDocument();
  });

  it("a row shows only the primary field's name and value, not prompt/answer content", () => {
    render(<SessionBreakdown breakdown={breakdown()} />);

    // Default tab is the first bucket with a nonzero count — passed_first_try.
    expect(screen.getByRole('button', { name: 'Front: Bonjour' })).toBeInTheDocument();
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('shows "Untitled card" for a card whose primary field is blank', async () => {
    const user = userEvent.setup();
    render(<SessionBreakdown breakdown={breakdown()} />);

    await user.click(screen.getByRole('tab', { name: '2+ retries (1)' }));

    expect(screen.getByRole('button', { name: 'Untitled card' })).toBeInTheDocument();
  });

  it('shows a "no cards" message for a bucket with nothing in it', async () => {
    const user = userEvent.setup();
    render(
      <SessionBreakdown
        breakdown={breakdown({
          passed_after_many_fails: 0,
          cards: breakdown().cards.filter((card) => card.bucket !== 'passed_after_many_fails'),
        })}
      />,
    );

    await user.click(screen.getByRole('tab', { name: '2+ retries (0)' }));

    expect(screen.getByText('No cards in this bucket.')).toBeInTheDocument();
  });

  it('opens the detail sheet with labels, ratings, and every attempt for a two-attempt card', async () => {
    const user = userEvent.setup();
    render(<SessionBreakdown breakdown={breakdown()} />);

    await user.click(screen.getByRole('tab', { name: 'One retry (1)' }));
    await user.click(screen.getByRole('button', { name: 'Front: Bonsoir' }));

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
  });

  it('shows no attempt header for a single-attempt card', async () => {
    const user = userEvent.setup();
    render(<SessionBreakdown breakdown={breakdown()} />);

    await user.click(screen.getByRole('button', { name: 'Front: Bonjour' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByText(/Attempt 1/)).not.toBeInTheDocument();
    expect(within(dialog).getByText('Bonjour')).toBeInTheDocument();
    expect(within(dialog).getByText('Easy')).toBeInTheDocument();
  });
});
