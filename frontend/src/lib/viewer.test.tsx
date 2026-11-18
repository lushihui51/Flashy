// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { mockLoading, mockSignedIn, mockSignedOut } from 'src/test/mocks/clerk';
import { GuestScrimContext, useViewer, useWriteGuard } from 'src/lib/viewer';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('useViewer', () => {
  it('answers loading until Clerk has loaded, then guest with no session and user with one', () => {
    vi.stubEnv('VITE_DEV_AUTH', '');
    mockLoading();
    const { result, rerender } = renderHook(() => useViewer());
    expect(result.current).toBe('loading');

    mockSignedOut();
    rerender();
    expect(result.current).toBe('guest');

    mockSignedIn();
    rerender();
    expect(result.current).toBe('user');
  });

  it('answers user for a guest in development with VITE_DEV_AUTH set, and guest without it', () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_DEV_AUTH', '1');
    mockSignedOut();
    const { result, rerender } = renderHook(() => useViewer());
    expect(result.current).toBe('user');

    vi.stubEnv('VITE_DEV_AUTH', '');
    rerender();
    expect(result.current).toBe('guest');

    // A production build leaves a guest a guest whatever the switch holds.
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_DEV_AUTH', '1');
    rerender();
    expect(result.current).toBe('guest');

    // The switch never turns a Clerk still loading into a user.
    vi.stubEnv('DEV', true);
    mockLoading();
    rerender();
    expect(result.current).toBe('loading');
  });
});

describe('useWriteGuard', () => {
  it('the guard runs the write for a user, and for a guest dims the screen and runs nothing', () => {
    vi.stubEnv('VITE_DEV_AUTH', '');
    const dimScreen = vi.fn();
    const write = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <GuestScrimContext.Provider value={dimScreen}>{children}</GuestScrimContext.Provider>
    );
    mockSignedIn();
    const { result, rerender } = renderHook(() => useWriteGuard(), { wrapper });

    result.current(write);
    expect(write).toHaveBeenCalledTimes(1);
    expect(dimScreen).not.toHaveBeenCalled();

    mockSignedOut();
    rerender();
    result.current(write);
    expect(write).toHaveBeenCalledTimes(1);
    expect(dimScreen).toHaveBeenCalledTimes(1);
  });
});
