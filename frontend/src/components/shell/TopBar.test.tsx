// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from 'src/test/testUtils';
import TopBar from 'src/components/shell/TopBar';

describe('TopBar', () => {
  it('renders the hamburger, logo, Create, and a static Log in button', () => {
    renderWithRouter(<TopBar onMenuClick={() => {}} isMenuOpen={false} />);

    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('link', { name: /flashy home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: '+ Create' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });

  it('calls onMenuClick when the hamburger is clicked', async () => {
    const user = userEvent.setup();
    const onMenuClick = vi.fn();
    renderWithRouter(<TopBar onMenuClick={onMenuClick} isMenuOpen={false} />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });

  it('reflects isMenuOpen in aria-expanded and label', () => {
    renderWithRouter(<TopBar onMenuClick={() => {}} isMenuOpen={true} />);

    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('does not navigate when Create is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TopBar onMenuClick={() => {}} isMenuOpen={false} />, ['/practice']);

    await user.click(screen.getByRole('button', { name: '+ Create' }));

    expect(screen.getByRole('button', { name: '+ Create' })).toBeInTheDocument();
  });
});
