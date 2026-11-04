import { useLayoutEffect, useRef, useState } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@clerk/react';
import TopBar from 'src/components/shell/TopBar';
import SearchBar from 'src/components/shell/SearchBar';
import SideDrawer from 'src/components/shell/SideDrawer';
import AccountSheet from 'src/components/shell/AccountSheet';
import CreateSheet from 'src/components/shell/CreateSheet';
import ConnectionBanner from 'src/components/shell/ConnectionBanner';
import { useConnectionStatus } from 'src/components/shell/useConnectionStatus';
import { readDecks } from 'src/api/deck';

export default function AppShell() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const { isSignedIn } = useUser();
  const connectionStatus = useConnectionStatus();

  // Only the Create sheet's Card row needs this (its "create a deck first" empty state,
  // since creating a card never creates a deck) — gated so opening the sheet is the
  // only thing that triggers the fetch.
  const { data: decks } = useQuery({
    queryKey: ['decks'],
    queryFn: () => readDecks(),
    enabled: isCreateSheetOpen && !!isSignedIn,
  });

  // A page's sticky row stops at this variable, so it follows the header as the connection
  // banner comes and goes, and is written before the first paint so no frame draws a row
  // with it unset.
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const writeHeight = () => {
      document.documentElement.style.setProperty(
        '--app-header-height',
        `${header.getBoundingClientRect().height}px`,
      );
    };
    writeHeight();
    const observer = new ResizeObserver(writeHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-(--color-ground)">
      {/* z-40: stays visible above the drawer/sheet's scrim/panel (z-20/30) while open. */}
      <header ref={headerRef} className="sticky top-0 z-40 flex flex-col gap-0.5 bg-(--color-ground) pb-2">
        {connectionStatus !== 'online' && <ConnectionBanner status={connectionStatus} />}
        <TopBar
          onMenuClick={() => setIsMenuOpen((open) => !open)}
          isMenuOpen={isMenuOpen}
          onAvatarClick={() => setIsAccountSheetOpen(true)}
          onCreateClick={() => setIsCreateSheetOpen(true)}
          menuButtonRef={menuButtonRef}
          avatarButtonRef={avatarButtonRef}
          createButtonRef={createButtonRef}
        />
        <div className="px-4">
          <SearchBar />
        </div>
      </header>
      <SideDrawer
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        triggerRef={menuButtonRef}
      />
      <AccountSheet
        open={isAccountSheetOpen}
        onClose={() => setIsAccountSheetOpen(false)}
        triggerRef={avatarButtonRef}
      />
      <CreateSheet
        open={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        triggerRef={createButtonRef}
        hasDecks={decks ? decks.length > 0 : undefined}
      />
      <main>
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  );
}
