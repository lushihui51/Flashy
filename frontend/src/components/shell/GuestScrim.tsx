import { useEffect, useEffectEvent, type ReactNode, type RefObject } from 'react';
import Scrim from 'src/components/ui/Scrim';

type GuestScrimProps = {
  open: boolean;
  /** Called on a pointerdown anywhere in the document and on a keydown of Escape; the caller closes it as well when the address changes. */
  onClose: () => void;
  /** The guest's banner, left lit. */
  banner: RefObject<HTMLElement | null>;
  /** "Log in" in the top bar, left lit. */
  logIn: RefObject<HTMLElement | null>;
};

/** The screen dimmed for a guest: while open, the whole screen at half of ink but for the guest's
 * banner and "Log in", with nothing else drawn and no focus moved. A press on the dimming reaches
 * nothing beneath it, and a press on a lit element reaches that element. */
export default function GuestScrim({ open, onClose, banner, logIn }: GuestScrimProps): ReactNode {
  const close = useEffectEvent(onClose);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = () => close();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    // On the document, so a press inside a hole, which never reaches the scrim, closes the screen
    // as a press on the dimming does. Neither event is prevented or stopped: a press on "Log in"
    // goes on to open the log-in dialog (ADR 134).
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!open) return null;
  return <Scrim lit={[banner, logIn]} strength="half" />;
}
