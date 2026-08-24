import { vi } from 'vitest';

export type MockClerkUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  username?: string | null;
  imageUrl?: string;
  primaryEmailAddress?: { emailAddress: string } | null;
};

type MockUseUserReturn = {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: MockClerkUser | null | undefined;
};

export const openSignIn = vi.fn();
export const signOut = vi.fn();

export const useUserMock = vi.fn<() => MockUseUserReturn>();

vi.mock('@clerk/react', () => ({
  useUser: () => useUserMock(),
  useClerk: () => ({ openSignIn, signOut }),
}));

export function mockSignedOut() {
  useUserMock.mockReturnValue({ isLoaded: true, isSignedIn: false, user: null });
}

export function mockLoading() {
  useUserMock.mockReturnValue({ isLoaded: false, isSignedIn: false, user: undefined });
}

export function mockSignedIn(user: Partial<MockClerkUser> = {}) {
  useUserMock.mockReturnValue({
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: 'user_1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      fullName: 'Ada Lovelace',
      username: 'ada',
      imageUrl: 'https://example.com/avatar.png',
      primaryEmailAddress: { emailAddress: 'ada@example.com' },
      ...user,
    },
  });
}
