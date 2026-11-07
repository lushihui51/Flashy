// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RatingChip from 'src/components/practice/RatingChip';

describe('RatingChip', () => {
  it('opening the list mounts the scrim', async () => {
    const user = userEvent.setup();
    render(<RatingChip fieldName="Back" rating={null} onSelect={() => {}} />);
    expect(screen.queryByTestId('scrim')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Rate Back' }));

    expect(screen.getByRole('button', { name: 'Good' })).toBeInTheDocument();
    expect(screen.getByTestId('scrim')).toBeInTheDocument();
  });

  it('a pointerdown on the scrim closes the list and clicks nothing beneath', async () => {
    const onBeside = vi.fn();
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <>
        <RatingChip fieldName="Back" rating={null} onSelect={onSelect} />
        <button type="button" onClick={onBeside}>
          Beside
        </button>
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Rate Back' }));
    expect(screen.getByRole('button', { name: 'Good' })).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByTestId('scrim'));

    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('scrim')).not.toBeInTheDocument();
    expect(onBeside).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('choosing a rating closes the list and the scrim', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<RatingChip fieldName="Back" rating={null} onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: 'Rate Back' }));

    await user.click(screen.getByRole('button', { name: 'Good' }));

    expect(onSelect).toHaveBeenCalledWith(3);
    expect(screen.queryByRole('button', { name: 'Good' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('scrim')).not.toBeInTheDocument();
  });
});
