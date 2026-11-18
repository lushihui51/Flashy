// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { signOut, mockSignedIn } from 'src/test/mocks/clerk';
import { renderWithProviders } from 'src/test/testUtils';
import { ApiDetailError } from 'src/api/unwrap';
import { deleteAccount } from 'src/api/account';
import AccountSheet from 'src/components/shell/AccountSheet';

vi.mock('src/api/account', () => ({ deleteAccount: vi.fn() }));

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
    renderWithProviders(<AccountSheet open onClose={() => {}} triggerRef={triggerRef} />);

    expect(screen.getByRole('img', { name: 'ada' })).toBeInTheDocument();
    expect(screen.getByText('ada')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  it('renders two action rows: Log out, then Delete account', () => {
    renderWithProviders(<AccountSheet open onClose={() => {}} triggerRef={triggerRef} />);

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Log out',
      'Delete account',
    ]);
  });

  it('Log out calls signOut and onClose, and navigates nowhere', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(
      <>
        <AccountSheet open onClose={onClose} triggerRef={triggerRef} />
        <LocationProbe />
      </>,
      ['/library'],
    );

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location')).toHaveTextContent('/library');
  });

  it('has dialog semantics labelled by the profile name', () => {
    renderWithProviders(<AccountSheet open onClose={() => {}} triggerRef={triggerRef} />);

    const dialog = screen.getByRole('dialog', { name: 'ada' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('calls onClose on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<AccountSheet open onClose={onClose} triggerRef={triggerRef} />);

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when closed', () => {
    renderWithProviders(<AccountSheet open={false} onClose={() => {}} triggerRef={triggerRef} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when the scrim is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<AccountSheet open onClose={onClose} triggerRef={triggerRef} />);

    await user.click(screen.getByTestId('scrim'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks body scroll while open and releases it on close', () => {
    const { rerender, queryClient } = renderWithProviders(
      <AccountSheet open onClose={() => {}} triggerRef={triggerRef} />,
    );
    expect(document.body).toHaveAttribute('data-scroll-locked');

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AccountSheet open={false} onClose={() => {}} triggerRef={triggerRef} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(document.body).not.toHaveAttribute('data-scroll-locked');
  });

  describe('Delete account', () => {
    it('opens a confirm with its title, sentence and buttons', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AccountSheet open onClose={() => {}} triggerRef={triggerRef} />);

      await user.click(screen.getByRole('button', { name: 'Delete account' }));

      const confirm = screen.getByRole('dialog', { name: 'Delete your account?' });
      expect(confirm).toHaveTextContent(
        "Your decks, cards, practices and runs will be gone, with your mastery. This can't be undone.",
      );
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    it('Delete calls deleteAccount once, then signOut, and navigates nowhere', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      vi.mocked(deleteAccount).mockResolvedValue(undefined);
      renderWithProviders(
        <>
          <AccountSheet open onClose={onClose} triggerRef={triggerRef} />
          <LocationProbe />
        </>,
        ['/library'],
      );

      await user.click(screen.getByRole('button', { name: 'Delete account' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
      expect(deleteAccount).toHaveBeenCalledTimes(1);
      expect(vi.mocked(deleteAccount).mock.invocationCallOrder[0]).toBeLessThan(
        signOut.mock.invocationCallOrder[0]!,
      );
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByTestId('location')).toHaveTextContent('/library');
    });

    it('a second press of Delete while the deletion is pending sends nothing more', async () => {
      const user = userEvent.setup();
      vi.mocked(deleteAccount).mockReturnValue(new Promise(() => {}));
      renderWithProviders(<AccountSheet open onClose={() => {}} triggerRef={triggerRef} />);

      await user.click(screen.getByRole('button', { name: 'Delete account' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      expect(deleteAccount).toHaveBeenCalledTimes(1);
    });

    it('a 502 keeps the confirm open with the trouble sentence and does not sign out', async () => {
      const user = userEvent.setup();
      vi.mocked(deleteAccount).mockRejectedValue(
        new ApiDetailError(502, { code: 'clerk_unavailable', message: 'Clerk answered 500' }),
      );
      renderWithProviders(<AccountSheet open onClose={() => {}} triggerRef={triggerRef} />);

      await user.click(screen.getByRole('button', { name: 'Delete account' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      const confirm = screen.getByRole('dialog', { name: 'Delete your account?' });
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Flashy is having trouble right now. Try again in a moment.',
      );
      expect(confirm).toContainElement(screen.getByRole('alert'));
      expect(signOut).not.toHaveBeenCalled();
    });

    it('Cancel after a failure closes the confirm, which opens again with no sentence', async () => {
      const user = userEvent.setup();
      vi.mocked(deleteAccount).mockRejectedValue(
        new ApiDetailError(502, { code: 'clerk_unavailable', message: 'Clerk answered 500' }),
      );
      renderWithProviders(<AccountSheet open onClose={() => {}} triggerRef={triggerRef} />);

      await user.click(screen.getByRole('button', { name: 'Delete account' }));
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      await screen.findByRole('alert');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('dialog', { name: 'Delete your account?' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Delete account' }));

      expect(screen.getByRole('dialog', { name: 'Delete your account?' })).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
