import { useLocation, Outlet } from 'react-router';
import { navItems } from 'src/navConfig';
import SideBar from 'src/components/layout/SideBar';
import TopBar from 'src/components/layout/TopBar';
import { HEADER_HEIGHT } from 'src/components/layout/constants';

export default function AppShell() {
  const { pathname } = useLocation();
  const topBarTitle = navItems.find((item) => item.path === pathname)?.label ?? 'Unknown Page';
  return (
    <div className="flex h-screen">
      <aside className="w-64 shrink-0 bg-sidebar">
        <SideBar />
      </aside>
      <div className="flex-1 flex flex-col bg-main">
        <header
          className={`${HEADER_HEIGHT} shrink-0 flex items-center border-b border-gray-500/15`}
        >
          <TopBar topBarTitle={topBarTitle} />
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
