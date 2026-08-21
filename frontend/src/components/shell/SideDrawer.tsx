import { type RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from 'src/components/shell/navItems';

type SideDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** The hamburger button, so focus returns to it on close (P1's TopBar
   * is a sibling of this component, not a Radix `Dialog.Trigger`, so Radix's
   * built-in return-focus-to-trigger doesn't apply — this does it manually). */
  triggerRef: RefObject<HTMLButtonElement | null>;
};

// Real top bar stays visible above the drawer (z-40 in AppShell vs. z-20/30
// here) instead of repeating the hamburger+logo inside the drawer — the
// hamburger already becomes the close control per its aria-label.
export default function SideDrawer({ open, onClose, triggerRef }: SideDrawerProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 bg-(--color-scrim)" />
        <Dialog.Content
          id="side-drawer"
          aria-label="Main menu"
          aria-modal="true"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
          className="fixed inset-y-0 left-0 z-30 flex w-72 max-w-[80vw] flex-col gap-1 bg-(--color-surface) p-3 pt-[calc(3.5rem+0.75rem)] focus:outline-none"
        >
          <nav>
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map(({ label, to, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex h-11 items-center gap-3 rounded-full px-4 text-sm font-medium ${
                        isActive
                          ? 'bg-(--color-primary) text-(--color-primary-contrast)'
                          : 'text-(--color-text)'
                      }`
                    }
                  >
                    <Icon aria-hidden="true" className="h-5 w-5" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
