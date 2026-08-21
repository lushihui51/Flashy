// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { signOut, mockSignedIn } from 'src/test/mocks/clerk';
import { renderWithRouter } from 'src/test/testUtils';
import AccountSheet from 'src/components/shell/AccountSheet';

const triggerRef = { current: null };

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSignedIn({
    username: 'ada',
    fullName: 'Ada Lovelace',
    primaryEmailAddress: { emailAddress: 'ada@example.com' },
  });
});

describe('AccountSheet', () => {
  it('renders the profile row: avatar, name, email', () => {
    renderWithRouter(<AccountSheet open onClose={() => {}} triggerRef={triggerRef} />);

    expect(screen.getByRole('img', { name: 'ada' })).toBeInTheDocument();
    expect(screen.getByText('ada')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  it('renders exactly one action row: Log out', () => {
    renderWithRouter(<AccountSheet open onClose={() => {}} triggerRef={triggerRef} />);

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });

  it('Log out calls signOut, then onClose, then navigates to /', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithRouter(
      <>
        <AccountSheet open onClose={onClose} triggerRef={triggerRef} />
        <LocationProbe />
      </>,
      ['/library'],
    );

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('has dialog semantics labelled by the profile name', () => {
    renderWithRouter(<AccountSheet open onClose={() => {}} triggerRef={triggerRef} />);

    const dialog = screen.getByRole('dialog', { name: 'ada' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithRouter(<AccountSheet open onClose={onClose} triggerRef={triggerRef} />);

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when closed', () => {
    renderWithRouter(<AccountSheet open={false} onClose={() => {}} triggerRef={triggerRef} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
