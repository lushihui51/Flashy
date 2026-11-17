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
