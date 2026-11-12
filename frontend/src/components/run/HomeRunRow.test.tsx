// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomeRunRow from 'src/components/run/HomeRunRow';
import type { components } from 'src/api/types';

type HomeRun = components['schemas']['HomeRun'];

const MAIN_ACTION_CLASS = 'bg-(--color-main-action)';

function homeRun(overrides: Partial<HomeRun> = {}): HomeRun {
  return {
    id: 'r1',
    practice_id: 'p1',
    practice_name: 'Commands + Ports',
    status: 'active',
    day: '2026-11-09',
    day_index: 0,
    created_at: '2026-11-09T18:00:00Z',
    last_activity_at: '2026-11-09T18:00:00Z',
    reached_cards: 3,
    counted_cards: 74,
    decks: [
      { deck_id: 'd1', deck_name: 'Commands' },
      { deck_id: 'd2', deck_name: 'Ports' },
    ],
    progress: { total_cards: 74, passed: 3, still_failed: 0, retry_pending: 0, unseen: 71 },
    ...overrides,
  };
}

function renderRow(
  run: HomeRun,
  { isMain = false, onPlay = () => {}, playError = null as string | null } = {},
) {
  return render(<HomeRunRow run={run} isMain={isMain} onPlay={onPlay} playError={playError} />);
}

describe('HomeRunRow', () => {
  it("opens with the run's mark and day in a block, then its practice's name, its decks and its bar", () => {
    const { container } = renderRow(homeRun({ day_index: 1 }));

    const mark = screen.getByRole('img', { name: 'Run' });
    const block = mark.parentElement!;
    expect(block).toHaveTextContent('2026-11-09 (1)');
    expect(block).toHaveClass('outlined-line');

    expect(screen.getByText('Commands + Ports')).toHaveClass('font-semibold');
    // The practice's name carries no mark of its own.
    expect(screen.queryByRole('img', { name: 'Practice' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'Deck' })).toHaveLength(2);
    expect(
      screen.getByRole('img', { name: '3 passed, 0 failed, 0 retrying, 71 unseen' }),
    ).toBeInTheDocument();
    // Nothing but the play button can be followed or pressed.
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(container).toHaveTextContent(/^2026-11-09 \(1\)Commands \+ Ports Commands · Ports$/);
  });

  it('draws no bar for a completed run', () => {
    renderRow(homeRun({ status: 'completed', progress: null }));

    expect(screen.queryByRole('img', { name: /passed/ })).not.toBeInTheDocument();
    expect(screen.getByText('Commands + Ports')).toBeInTheDocument();
  });

  it('names its play button after the practice and runs onPlay when it is pressed', async () => {
    const onPlay = vi.fn();
    renderRow(homeRun(), { onPlay });

    await userEvent.click(screen.getByRole('button', { name: 'Practice Commands + Ports' }));

    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('draws the play button yellow only when it is the main action', () => {
    const { unmount } = renderRow(homeRun(), { isMain: true });
    expect(screen.getByRole('button', { name: 'Practice Commands + Ports' })).toHaveClass(
      MAIN_ACTION_CLASS,
    );
    unmount();

    renderRow(homeRun());
    expect(screen.getByRole('button', { name: 'Practice Commands + Ports' })).not.toHaveClass(
      MAIN_ACTION_CLASS,
    );
  });

  it('shows the play error beneath the row, and nothing when there is none', () => {
    const { unmount } = renderRow(homeRun(), { playError: 'Practice not found.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Practice not found.');
    unmount();

    renderRow(homeRun());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
