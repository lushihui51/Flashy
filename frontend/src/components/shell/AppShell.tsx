import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import TopBar from 'src/components/shell/TopBar';
import SideDrawer from 'src/components/shell/SideDrawer';
import AccountSheet from 'src/components/shell/AccountSheet';
import CreateSheet from 'src/components/shell/CreateSheet';
import ConnectionBanner from 'src/components/shell/ConnectionBanner';
import ExampleBanner from 'src/components/shell/ExampleBanner';
import LogInPrompt from 'src/components/shell/LogInPrompt';
import { useConnectionStatus } from 'src/components/shell/useConnectionStatus';
import { readDecks } from 'src/api/deck';
import { LogInPromptContext, loadHomeAfresh, useViewer, type Viewer } from 'src/lib/viewer';

export default function AppShell() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const logInButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const viewer = useViewer();
  const connectionStatus = useConnectionStatus();
  const location = useLocation();

  // The address the log-in prompt was opened at: it stands only while the address is that one,
  // so any change of address closes it.
  const [promptKey, setPromptKey] = useState<string | null>(null);
  const openPrompt = useCallback(() => setPromptKey(location.key), [location.key]);

  // The viewer the page is drawn for, set once Clerk has loaded. A different answer after
  // that is a log-in or a log-out: the page stops being drawn, so nothing of one viewer's
  // shows under the other, and Home loads afresh, which empties everything held in memory
  // (ADR 132).
  const [pageViewer, setPageViewer] = useState<Viewer>('loading');
  if (pageViewer === 'loading' && viewer !== 'loading') setPageViewer(viewer);
  const viewerChanged = pageViewer !== 'loading' && viewer !== 'loading' && viewer !== pageViewer;
  const drawsPage = viewer !== 'loading' && viewer === pageViewer;
  const homeLoading = useRef(false);
  useEffect(() => {
    if (!viewerChanged || homeLoading.current) return;
    homeLoading.current = true;
    loadHomeAfresh();
  }, [viewerChanged]);

  // Only the Create sheet's Card row needs this (its "create a deck first" empty state,
  // since creating a card never creates a deck) — gated so opening the sheet is the
  // only thing that triggers the fetch.
  const { data: decks } = useQuery({
    queryKey: ['decks'],
    queryFn: () => readDecks(),
    enabled: isCreateSheetOpen && viewer !== 'loading',
  });

  // The side menu starts at this variable, so it follows the header as the banners come
  // and go, and is written before the first paint so no frame draws the menu with it unset.
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
      {/* z-40: stays visible above the drawer/sheet's scrim/panel (z-20/30) while open.
          The mark tells a reveal after a tab or filter change to keep clear of the header. */}
      <header
        ref={headerRef}
        data-reveal-clear
        className="sticky top-0 z-40 mx-auto flex w-full max-w-column flex-col gap-0.5 bg-(--color-ground) pb-2"
      >
        {connectionStatus !== 'online' && <ConnectionBanner status={connectionStatus} />}
        {viewer === 'guest' && <ExampleBanner />}
        <TopBar
          onMenuClick={() => setIsMenuOpen((open) => !open)}
          isMenuOpen={isMenuOpen}
          onAvatarClick={() => setIsAccountSheetOpen(true)}
          onCreateClick={() => setIsCreateSheetOpen(true)}
          menuButtonRef={menuButtonRef}
          avatarButtonRef={avatarButtonRef}
          createButtonRef={createButtonRef}
          logInButtonRef={logInButtonRef}
        />
      </header>
      <LogInPrompt
        open={promptKey === location.key}
        onClose={() => setPromptKey(null)}
        anchor={logInButtonRef}
      />
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
      <main className="mx-auto w-full max-w-column">
        <LogInPromptContext.Provider value={openPrompt}>
          {drawsPage && <Outlet />}
        </LogInPromptContext.Provider>
      </main>
      <ScrollRestoration />
    </div>
  );
}
