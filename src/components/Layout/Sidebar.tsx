import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, BarChart2, Brain, CalendarCheck, Settings, TrendingUp,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../../store';
import { t } from '../../i18n';

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, key: 'dashboard' as const },
  { to: '/journal',   icon: BookOpen,         key: 'journal' as const },
  { to: '/analytics', icon: BarChart2,        key: 'analytics' as const },
  { to: '/psychology',icon: Brain,            key: 'psychology' as const },
  { to: '/planner',   icon: CalendarCheck,   key: 'planner' as const },
  { to: '/settings',  icon: Settings,        key: 'settings' as const },
];

export function Sidebar() {
  const { language } = useStore();
  const tr = t(language);

  return (
    <aside className="flex flex-col w-[220px] min-h-screen bg-[#0f0f17] border-r border-[#1e1e2e] flex-shrink-0">
      {/* Logo */}
      <div className="p-5 pb-4 border-b border-[#1e1e2e]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#00d4aa] flex items-center justify-center">
            <TrendingUp size={16} className="text-[#0a0a0f]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#e2e2f0] leading-none">TradeLog</div>
            <div className="text-[10px] text-[#55557a] font-mono mt-0.5">PROFESSIONAL</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2">
        {navItems.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-md mb-0.5 text-sm transition-all',
                isActive
                  ? 'bg-[rgba(0,212,170,0.12)] text-[#00d4aa] border border-[rgba(0,212,170,0.2)]'
                  : 'text-[#8888aa] hover:text-[#e2e2f0] hover:bg-[#14141e]'
              )
            }
          >
            <Icon size={16} />
            <span>{tr.nav[key]}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom status */}
      <div className="p-4 border-t border-[#1e1e2e]">
        <div className="text-[10px] text-[#55557a] font-mono">v1.0.0 · TradeLog</div>
      </div>
    </aside>
  );
}
