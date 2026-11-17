// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { useRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LogInPrompt from 'src/components/shell/LogInPrompt';

/** "Log in", the control a guest pressed, and the prompt anchored to "Log in". */
function Harness({ open, onClose }: { open: boolean; onClose: () => void }) {
  const logIn = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={logIn} type="button">
        Log in
      </button>
      <button type="button">Start run</button>
      <LogInPrompt open={open} onClose={onClose} anchor={logIn} />
    </>
  );
}

describe('LogInPrompt', () => {
  it('says its sentence with role status and takes no focus', () => {
    const { rerender } = render(<Harness open={false} onClose={() => {}} />);
    const pressed = screen.getByRole('button', { name: 'Start run' });
    pressed.focus();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    rerender(<Harness open onClose={() => {}} />);

    expect(screen.getByRole('status')).toHaveTextContent(/^Log in to use all of Flashy\.$/);
    expect(screen.getByTestId('scrim')).toHaveClass('bg-(--color-ink)/50');
    expect(pressed).toHaveFocus();
  });

  it('stays open while focus moves', () => {
    const onClose = vi.fn();
    render(<Harness open onClose={onClose} />);

    screen.getByRole('button', { name: 'Start run' }).focus();
    screen.getByRole('button', { name: 'Log in' }).focus();

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('closes on a press on the scrim and on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness open onClose={onClose} />);

    fireEvent.pointerDown(screen.getByTestId('scrim'));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
