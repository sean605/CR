import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { getInitials } from '../../lib/formatters';
import {
  LayoutDashboard, Users, UserPlus, Kanban, CheckSquare,
  BarChart3, Mail, Zap, Settings, LogOut, ChevronLeft, ChevronRight,
  Building2
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/leads', icon: UserPlus, label: 'Leads' },
  { to: '/deals', icon: Kanban, label: 'Pipeline' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/team', icon: Building2, label: 'Team' },
  { to: '/email/templates', icon: Mail, label: 'Email' },
  { to: '/automations', icon: Zap, label: 'Automations' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-screen bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-200 z-30',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-800">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">CR</span>
          </div>
          {!sidebarCollapsed && (
            <span className="font-semibold text-white truncate">CloudRealty</span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              )
            }
          >
            <item.icon size={20} className="flex-shrink-0" />
            {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center py-2 text-gray-500 hover:text-gray-300 border-t border-gray-800"
      >
        {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      {/* User */}
      {user && (
        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-400 text-xs font-medium">
                {getInitials(user.first_name, user.last_name)}
              </span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-200 truncate">
                  {user.first_name} {user.last_name}
                </div>
                <div className="text-xs text-gray-500 truncate">{user.email}</div>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={logout}
                className="text-gray-500 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
