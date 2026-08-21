import { useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from 'src/components/shell/TopBar';
import SearchBar from 'src/components/shell/SearchBar';
import SideDrawer from 'src/components/shell/SideDrawer';

export default function AppShell() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="min-h-screen bg-(--color-surface)">
      {/* z-40: stays visible above the drawer's scrim/panel (z-20/30) while open. */}
      <header className="sticky top-0 z-40 flex flex-col gap-2 bg-(--color-surface) pb-2">
        <TopBar
          onMenuClick={() => setIsMenuOpen((open) => !open)}
          isMenuOpen={isMenuOpen}
          // AccountSheet lands in P4; until then the avatar button is inert.
          onAvatarClick={() => {}}
          menuButtonRef={menuButtonRef}
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
      <main>
        <Outlet />
      </main>
    </div>
  );
}
