// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FieldAssignmentBoard from 'src/components/library/FieldAssignmentBoard';
import { boardFromConfig } from 'src/lib/deckBoard';

const FIELD_DEFS = [
  { id: 'f1', name: 'Port Number', type: 'text' as const, position: 0 },
  { id: 'f2', name: 'Protocol Name', type: 'text' as const, position: 1 },
  { id: 'f3', name: 'TCP or UDP', type: 'text' as const, position: 2 },
];

// Port Number always shown on the prompt side, Protocol Name drawn on the answer side with its
// count of 1 chosen, and TCP or UDP not used, so every chip and both looks of a count show.
const STATE = boardFromConfig(FIELD_DEFS, {
  prompt_field_ids: ['f1'],
  answer_field_ids: [],
  prompt_pool_ids: [],
  prompt_pool_counts: [],
  answer_pool_ids: ['f2', 'f3'],
  answer_pool_counts: [1],
});

function renderBoard(readOnly: boolean) {
  const onMove = vi.fn();
  const onToggleCount = vi.fn();
  render(
    <FieldAssignmentBoard
      fieldDefs={FIELD_DEFS}
      state={STATE}
      onMove={onMove}
      onToggleCount={onToggleCount}
      problem={null}
      readOnly={readOnly}
    />,
  );
  return { onMove, onToggleCount };
}

const chips = () =>
  ['[Port Number]', '[Protocol Name]', '[TCP or UDP]'].map((name) =>
    screen.getByRole('button', { name }),
  );
const counts = () => screen.getAllByRole('checkbox').map((box) => box.closest('label')!);

describe('FieldAssignmentBoard', () => {
  it('opens the move sheet on a tap on a chip', async () => {
    const user = userEvent.setup();
    renderBoard(false);

    await user.click(screen.getByRole('button', { name: '[Port Number]' }));

    expect(await screen.findByRole('dialog')).toHaveTextContent('Move "[Port Number]" to…');
  });

  it('read only, a tap on a chip opens no move sheet', async () => {
    const user = userEvent.setup();
    const { onMove } = renderBoard(true);

    await user.click(screen.getByRole('button', { name: '[Port Number]' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onMove).not.toHaveBeenCalled();
  });

  it('read only, a tap on a count calls no onToggleCount', async () => {
    const user = userEvent.setup();
    const { onToggleCount } = renderBoard(true);

    for (const count of counts()) await user.click(count);

    expect(onToggleCount).not.toHaveBeenCalled();
  });

  it('read only, every chip and count is greyed, a chosen count still filled', () => {
    renderBoard(true);

    for (const chip of chips()) {
      expect(chip).toHaveClass('outlined-line', 'text-(--color-aside)');
      expect(chip).not.toHaveClass('tappable-sm');
    }
    const [one, two] = counts();
    for (const count of [one, two]) {
      expect(count).toHaveClass('outlined-line', 'text-(--color-aside)');
      expect(count).not.toHaveClass('tappable-sm');
      expect(count).not.toHaveClass('tappable-pressed');
    }
    expect(one).toHaveClass('bg-(--color-line)');
    expect(two).toHaveClass('bg-(--color-surface)');
  });

  it('not read only, a tap on a count calls onToggleCount', async () => {
    const user = userEvent.setup();
    const { onToggleCount } = renderBoard(false);

    await user.click(counts()[1]!);

    expect(onToggleCount).toHaveBeenCalledWith('answer_pool', 2);
  });
});
