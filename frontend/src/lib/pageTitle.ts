import { useEffect } from 'react';

const APP_NAME = 'Flashy';

/** Sets the browser tab to `<name> · Flashy` while the calling page is mounted and
 * `name` is known, and restores "Flashy" when it unmounts. An undefined name leaves
 * the title as it is, for a page whose name is still loading. */
export function usePageTitle(name: string | undefined): void {
  useEffect(() => {
    if (name !== undefined) document.title = `${name} · ${APP_NAME}`;
  }, [name]);

  // Apart from the effect above, so the restore runs only on unmount: a name turning
  // undefined keeps the last title instead of falling back to "Flashy".
  useEffect(
    () => () => {
      document.title = APP_NAME;
    },
    [],
  );
}
