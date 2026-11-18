// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import InlineLink from 'src/components/ui/InlineLink';

describe('InlineLink', () => {
  it('renders one link with its href and children', () => {
    const { container } = render(
      <p>
        Write to <InlineLink href="mailto:someone@example.com">someone@example.com</InlineLink>.
      </p>,
    );

    expect(container.querySelectorAll('a')).toHaveLength(1);
    const link = screen.getByRole('link', { name: 'someone@example.com' });
    expect(link).toHaveAttribute('href', 'mailto:someone@example.com');
  });

  it('carries none of the block classes', () => {
    render(<InlineLink href="mailto:someone@example.com">someone@example.com</InlineLink>);

    const link = screen.getByRole('link');
    for (const blockClass of ['tappable', 'tappable-sm', 'tappable-pressed']) {
      expect(link).not.toHaveClass(blockClass);
    }
  });
});
