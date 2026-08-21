import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from 'src/components/shell/TopBar';
import SearchBar from 'src/components/shell/SearchBar';

export default function AppShell() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <header className="sticky top-0 z-10 flex flex-col gap-2 bg-[var(--color-surface)] pb-2">
        <TopBar onMenuClick={() => setIsMenuOpen((open) => !open)} isMenuOpen={isMenuOpen} />
        <div className="px-3">
          <SearchBar />
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
