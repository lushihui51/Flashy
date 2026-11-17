import { type ReactNode, type RefObject } from 'react';
import * as Popover from '@radix-ui/react-popover';
import Scrim from 'src/components/ui/Scrim';

type LogInPromptProps = {
  open: boolean;
  onClose: () => void;
  /** "Log in" in the top bar: the prompt is anchored to it, and it stays lit in the scrim's hole. */
  anchor: RefObject<HTMLButtonElement | null>;
};

/** Tells a guest to log in: dims the whole screen but for "Log in", with the sentence in white
 * beneath it. It takes no focus. `onClose` is called on a press on the dimming or on "Log in",
 * and on Escape; the caller closes it as well when the address changes. */
export default function LogInPrompt({ open, onClose, anchor }: LogInPromptProps): ReactNode {
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Popover.Anchor virtualRef={anchor} />
      <Popover.Portal>
        {/* One element, since the portal takes a single child; it starts no stacking context,
            so the sentence's z-60 stands above the scrim's z-50. */}
        <div>
          <Scrim anchor={anchor} onDismiss={onClose} strength="half" />
          <Popover.Content
            role="status"
            side="bottom"
            align="end"
            sideOffset={10}
            // Focus stays on the control that was pressed.
            onOpenAutoFocus={(event) => event.preventDefault()}
            // Focus is never inside it, so a move of focus, such as a rating's list handing it
            // back to its chip, must not close it.
            onFocusOutside={(event) => event.preventDefault()}
            className="z-60 text-sm text-(--color-surface)"
          >
            Log in to use all of Flashy.
          </Popover.Content>
        </div>
      </Popover.Portal>
    </Popover.Root>
  );
}
