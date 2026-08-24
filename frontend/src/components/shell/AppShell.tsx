import { useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@clerk/react';
import TopBar from 'src/components/shell/TopBar';
import SearchBar from 'src/components/shell/SearchBar';
import SideDrawer from 'src/components/shell/SideDrawer';
import AccountSheet from 'src/components/shell/AccountSheet';
import CreateSheet from 'src/components/shell/CreateSheet';
import { readDecks } from 'src/api/deck';

export default function AppShell() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const { isSignedIn } = useUser();

  // Only the Create sheet's Card row needs this (D4's "create a deck first" empty
  // state) — gated so opening the sheet is the only thing that triggers the fetch.
  const { data: decks } = useQuery({
    queryKey: ['decks'],
    queryFn: () => readDecks(),
    enabled: isCreateSheetOpen && !!isSignedIn,
  });

  return (
    <div className="min-h-screen bg-(--color-surface)">
      {/* z-40: stays visible above the drawer/sheet's scrim/panel (z-20/30) while open. */}
      <header className="sticky top-0 z-40 flex flex-col gap-2 bg-(--color-surface) pb-2">
        <TopBar
          onMenuClick={() => setIsMenuOpen((open) => !open)}
          isMenuOpen={isMenuOpen}
          onAvatarClick={() => setIsAccountSheetOpen(true)}
          onCreateClick={() => setIsCreateSheetOpen(true)}
          menuButtonRef={menuButtonRef}
          avatarButtonRef={avatarButtonRef}
          createButtonRef={createButtonRef}
        />
        <div className="px-3">
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
    </div>
  );
}
