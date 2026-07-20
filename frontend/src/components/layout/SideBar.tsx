import { NavLink } from 'react-router';
import { navItems } from 'src/navConfig';
import { Zap } from 'lucide-react';
import { HEADER_HEIGHT } from 'src/components/layout/constants';

export default function SideBar() {
  return (
    <div className="flex flex-col h-full">
      <div
        className={`${HEADER_HEIGHT} flex items-center px-4 border-b border-white/15 gap-3 ml-3`}
      >
        <Zap size={32} className="text-main bg-sidebar-active p-2 rounded-lg" />
        <span className="text-xl font-bold text-main">Flashy</span>
      </div>
      <nav className="mt-4">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `text-sm text-main px-4 py-2 flex items-center gap-3 rounded-lg mx-2 my-0.5 ${isActive ? 'bg-sidebar-active' : 'hover:bg-sidebar-hover'}`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
