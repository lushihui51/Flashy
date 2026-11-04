// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from 'src/pages/HomePage';

describe('placeholder pages', () => {
  it('HomePage smoke renders with an <h1>', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
  });

  it('HomePage titles the browser tab', () => {
    render(<HomePage />);
    expect(document.title).toBe('Home · Flashy');
  });
});
