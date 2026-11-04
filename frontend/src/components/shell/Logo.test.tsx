// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter } from 'src/test/testUtils';
import Logo from 'src/components/shell/Logo';

describe('Logo', () => {
  it('renders a link to /', () => {
    renderWithRouter(<Logo />);
    expect(screen.getByRole('link', { name: /flashy home/i })).toHaveAttribute('href', '/');
  });

  it('draws the word as the F followed by the text lashy', () => {
    renderWithRouter(<Logo />);
    const link = screen.getByRole('link', { name: /flashy home/i });

    expect(link).toHaveTextContent(/^lashy$/);
    expect(link.querySelector('path')).toHaveAttribute(
      'd',
      'M0,0 H49 V15 H18 V29 H42 V44 H18 V70 H0 Z',
    );
  });
});
