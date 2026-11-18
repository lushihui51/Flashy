import { createContext, useCallback, useContext, type Context } from 'react';
import { useUser } from '@clerk/react';

export type Viewer = 'loading' | 'guest' | 'user';

/** Who is looking: `loading` until Clerk has loaded, then `guest` while Clerk holds no
 * session and `user` while it holds one. In a development build with `VITE_DEV_AUTH`
 * set, a guest reads as `user`, to match the API's local bypass. */
export function useViewer(): Viewer {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return 'loading';
  if (isSignedIn) return 'user';
  // `DEV` is false in a production build, so the switch is never read there.
  return import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH ? 'user' : 'guest';
}

/** Loads Home afresh in the browser, replacing the current address. */
export function loadHomeAfresh(): void {
  window.location.replace('/');
}

/** Dims the screen for a guest. `AppShell` provides it; outside the shell it does nothing. */
export const GuestScrimContext: Context<() => void> = createContext<() => void>(() => {});

/** For a control that would write. The function it returns runs `write` while `useViewer()`
 * answers `user`; otherwise it dims the screen for a guest and runs nothing. */
export function useWriteGuard(): (write: () => void) => void {
  const viewer = useViewer();
  const dimScreen = useContext(GuestScrimContext);
  return useCallback(
    (write: () => void) => {
      if (viewer === 'user') write();
      else dimScreen();
    },
    [viewer, dimScreen],
  );
}
