// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from 'src/test/testUtils';
import SideDrawer from 'src/components/shell/SideDrawer';

const triggerRef = { current: null };

describe('SideDrawer', () => {
  it('renders exactly the four nav items in order when open', () => {
    renderWithRouter(<SideDrawer open onClose={() => {}} triggerRef={triggerRef} />);

    const items = screen.getAllByRole('link');
    expect(items.map((item) => item.textContent)).toEqual([
      'Home',
      'Your library',
      'Practice',
      'Notifications',
    ]);
  });

  it('renders nothing when closed', () => {
    renderWithRouter(<SideDrawer open={false} onClose={() => {}} triggerRef={triggerRef} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when a nav item is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithRouter(<SideDrawer open onClose={onClose} triggerRef={triggerRef} />);

    await user.click(screen.getByRole('link', { name: /your library/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithRouter(<SideDrawer open onClose={onClose} triggerRef={triggerRef} />);

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has dialog semantics with the expected label', () => {
    renderWithRouter(<SideDrawer open onClose={() => {}} triggerRef={triggerRef} />);

    const dialog = screen.getByRole('dialog', { name: 'Main menu' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
