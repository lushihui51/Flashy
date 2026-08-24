// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { renderWithRouter } from 'src/test/testUtils';
import SideDrawer from 'src/components/shell/SideDrawer';

const triggerRef = { current: null };

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

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

  it('clicking a nav item navigates to its route and calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithRouter(
      <>
        <SideDrawer open onClose={onClose} triggerRef={triggerRef} />
        <LocationProbe />
      </>,
    );

    await user.click(screen.getByRole('link', { name: /your library/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location')).toHaveTextContent('/library');
  });

  it('highlights the active item and only the active item', () => {
    renderWithRouter(<SideDrawer open onClose={() => {}} triggerRef={triggerRef} />, [
      '/library',
    ]);

    expect(screen.getByRole('link', { name: /your library/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /^home/i })).not.toHaveAttribute('aria-current');
  });

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithRouter(<SideDrawer open onClose={onClose} triggerRef={triggerRef} />);

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the scrim is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithRouter(<SideDrawer open onClose={onClose} triggerRef={triggerRef} />);

    await user.click(screen.getByTestId('scrim'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks body scroll while open and releases it on close', () => {
    const { rerender } = renderWithRouter(
      <SideDrawer open onClose={() => {}} triggerRef={triggerRef} />,
    );
    expect(document.body).toHaveAttribute('data-scroll-locked');

    rerender(
      <MemoryRouter>
        <SideDrawer open={false} onClose={() => {}} triggerRef={triggerRef} />
      </MemoryRouter>,
    );
    expect(document.body).not.toHaveAttribute('data-scroll-locked');
  });

  it('has dialog semantics with the expected label', () => {
    renderWithRouter(<SideDrawer open onClose={() => {}} triggerRef={triggerRef} />);

    const dialog = screen.getByRole('dialog', { name: 'Main menu' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
