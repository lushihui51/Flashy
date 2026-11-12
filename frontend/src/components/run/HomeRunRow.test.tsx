// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import HomeRunRow from 'src/components/run/HomeRunRow';
import type { components } from 'src/api/types';
import type { ChangeKind } from 'src/lib/changeKinds';

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

type Breakdown = { change: ChangeKind }[] | 'loading' | 'error';

function renderRow(
  run: HomeRun,
  {
    isMain = false,
    onPlay = () => {},
    playError = null as string | null,
    open = false,
    onToggle = () => {},
    breakdown = undefined as Breakdown | undefined,
  } = {},
) {
  return render(
    <HomeRunRow
      run={run}
      isMain={isMain}
      onPlay={onPlay}
      playError={playError}
      open={open}
      onToggle={onToggle}
      breakdown={breakdown}
    />,
  );
}

/** The row with its open state held as HomePage holds it, so a tap opens and closes it. */
function ToggledRow({ run, breakdown }: { run: HomeRun; breakdown?: Breakdown }) {
  const [open, setOpen] = useState(false);
  return (
    <HomeRunRow
      run={run}
      isMain={false}
      onPlay={() => {}}
      playError={null}
      open={open}
      onToggle={() => setOpen((was) => !was)}
      breakdown={breakdown}
    />
  );
}

const completedRun = () =>
  homeRun({ status: 'completed', progress: null, reached_cards: 19, counted_cards: 19 });

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
    // The row is no link: a tap on it opens its details, and the play button is its other button.
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('button').map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Commands + Ports', 'Practice Commands + Ports']);
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

  describe('its details', () => {
    it('open beneath the row on a tap anywhere but the play button, and not on the play button', async () => {
      render(<ToggledRow run={homeRun()} />);
      const row = screen.getByRole('button', { name: 'Commands + Ports' });
      expect(row).toHaveAttribute('aria-expanded', 'false');

      await userEvent.click(screen.getByRole('button', { name: 'Practice Commands + Ports' }));
      expect(row).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('button', { name: 'Hide' })).not.toBeInTheDocument();

      await userEvent.click(screen.getByText('Commands + Ports'));
      expect(row).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('button', { name: 'Hide' })).toBeInTheDocument();
    });

    it('close on a second tap on the row and on "Hide"', async () => {
      render(<ToggledRow run={homeRun()} />);
      const row = screen.getByRole('button', { name: 'Commands + Ports' });

      await userEvent.click(row);
      await userEvent.click(row);
      expect(row).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('button', { name: 'Hide' })).not.toBeInTheDocument();

      await userEvent.click(row);
      await userEvent.click(screen.getByRole('button', { name: 'Hide' }));
      expect(row).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('button', { name: 'Hide' })).not.toBeInTheDocument();
    });

    it("of an active run list each deck on a line, then its four counts, each beside its bar color's square", () => {
      const { container } = renderRow(
        homeRun({
          progress: { total_cards: 74, passed: 3, still_failed: 2, retry_pending: 1, unseen: 68 },
        }),
        { open: true },
      );

      const hide = screen.getByRole('button', { name: 'Hide' });
      const details = hide.parentElement!;
      expect(within(details).getAllByRole('img', { name: 'Deck' })).toHaveLength(2);
      expect(within(details).getByText('Commands')).toBeInTheDocument();
      expect(within(details).getByText('Ports')).toBeInTheDocument();
      const counts = ['3 passed', '2 failed', '1 retrying', '68 unseen'].map((words) =>
        within(details).getByText(
          (_, element) =>
            element?.textContent === words &&
            element.tagName === 'SPAN' &&
            element.parentElement?.tagName === 'SPAN',
        ),
      );
      // Each count's square, before its words, in the bar's color for that count.
      ['bg-(--color-ink)', 'bg-(--color-wrong)', 'bg-(--color-aside)', 'bg-(--color-line)'].forEach(
        (color, index) => expect(counts[index]!.previousElementSibling).toHaveClass(color),
      );
      expect(details).toHaveTextContent(/^Commands Ports3 passed2 failed1 retrying68 unseenHide$/);
      expect(container).not.toHaveTextContent('cards');
    });

    it('of a completed run list each deck on a line, then "N of M cards", then its five change counts from its breakdown', () => {
      renderRow(completedRun(), {
        open: true,
        breakdown: [
          { change: 'up_a_lot' },
          { change: 'up' },
          { change: 'up' },
          { change: 'down' },
          { change: 'down_a_lot' },
          { change: 'down_a_lot' },
        ],
      });

      const details = screen.getByRole('button', { name: 'Hide' }).parentElement!;
      expect(within(details).getAllByRole('img', { name: 'Deck' })).toHaveLength(2);
      expect(within(details).getByText('19 of 19 cards')).toBeInTheDocument();
      expect(
        ['1 up a lot', '2 up', '0 no change', '1 down', '2 down a lot'].map(
          (name) => within(details).getByRole('img', { name }).textContent,
        ),
      ).toEqual(['1', '2', '0', '1', '2']);
      expect(within(details).queryByText(/passed/)).not.toBeInTheDocument();
    });

    it('of a completed run hold their deck lines and count line, and no change count or words, until the breakdown arrives', () => {
      renderRow(completedRun(), { open: true, breakdown: 'loading' });

      const details = screen.getByRole('button', { name: 'Hide' }).parentElement!;
      expect(details).toHaveTextContent(/^Commands Ports19 of 19 cardsHide$/);
      expect(
        within(details).queryByRole('img', { name: /up|down|no change/ }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('of a completed run say "Could not load this run." in the counts\' place when the breakdown fails', () => {
      renderRow(completedRun(), { open: true, breakdown: 'error' });

      const details = screen.getByRole('button', { name: 'Hide' }).parentElement!;
      expect(within(details).getByRole('alert')).toHaveTextContent('Could not load this run.');
      expect(details).toHaveTextContent(
        /^Commands Ports19 of 19 cardsCould not load this run\.Hide$/,
      );
      expect(
        within(details).queryByRole('img', { name: /up|down|no change/ }),
      ).not.toBeInTheDocument();
    });
  });
});
