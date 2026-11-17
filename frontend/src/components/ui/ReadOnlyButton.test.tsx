// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReadOnlyButton from 'src/components/ui/ReadOnlyButton';

describe('ReadOnlyButton', () => {
  it('is aria-disabled, never disabled, and a press calls onPress', async () => {
    const onPress = vi.fn();
    const user = userEvent.setup();
    render(
      <form onSubmit={() => onPress('submitted')}>
        <ReadOnlyButton onPress={onPress} aria-label="Move Front up" className="h-9 w-9">
          Up
        </ReadOnlyButton>
      </form>,
    );

    const button = screen.getByRole('button', { name: 'Move Front up' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('h-9', 'w-9', 'aria-disabled:text-(--color-aside)');

    await user.click(button);

    expect(onPress).toHaveBeenCalledExactlyOnceWith();
  });
});
