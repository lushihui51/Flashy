// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StickyPageRow from 'src/components/ui/StickyPageRow';

describe('StickyPageRow', () => {
  it('renders its children in a row marked for a reveal to clear', () => {
    render(
      <StickyPageRow>
        <button type="button">Create</button>
      </StickyPageRow>,
    );

    const row = screen.getByRole('button', { name: 'Create' }).parentElement;
    expect(row).toHaveAttribute('data-reveal-clear');
    expect(row).toHaveClass('sticky', 'top-(--app-header-height)');
  });
});
