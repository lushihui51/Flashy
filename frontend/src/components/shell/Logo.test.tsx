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
});
