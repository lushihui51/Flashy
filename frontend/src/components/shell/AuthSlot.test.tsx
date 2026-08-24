// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from 'src/test/testUtils';
import { openSignIn, mockSignedOut, mockLoading, mockSignedIn } from 'src/test/mocks/clerk';
import AuthSlot from 'src/components/shell/AuthSlot';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthSlot', () => {
  it('renders a placeholder while Clerk is loading', () => {
    mockLoading();
    renderWithRouter(<AuthSlot onAvatarClick={() => {}} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('signed out: renders Log in and calls openSignIn when clicked', async () => {
    const user = userEvent.setup();
    mockSignedOut();
    renderWithRouter(<AuthSlot onAvatarClick={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(openSignIn).toHaveBeenCalledTimes(1);
  });

  it('signed in: renders the avatar image with the user name in alt text', () => {
    mockSignedIn({ fullName: 'Ada Lovelace', imageUrl: 'https://example.com/ada.png' });
    renderWithRouter(<AuthSlot onAvatarClick={() => {}} />);

    const avatar = screen.getByRole('img', { name: /ada lovelace/i });
    expect(avatar).toHaveAttribute('src', 'https://example.com/ada.png');
  });

  it('signed in: clicking the avatar calls onAvatarClick, not navigation', async () => {
    const user = userEvent.setup();
    const onAvatarClick = vi.fn();
    mockSignedIn();
    renderWithRouter(<AuthSlot onAvatarClick={onAvatarClick} />);

    await user.click(screen.getByRole('button', { name: /account menu/i }));

    expect(onAvatarClick).toHaveBeenCalledTimes(1);
  });

  it('signed in without an imageUrl: falls back to initials', () => {
    mockSignedIn({ imageUrl: undefined, firstName: 'Grace', lastName: 'Hopper' });
    renderWithRouter(<AuthSlot onAvatarClick={() => {}} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('GH')).toBeInTheDocument();
  });
});
