import { useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/contacts': 'Contacts',
  '/leads': 'Leads',
  '/deals': 'Pipeline',
  '/tasks': 'Tasks',
  '/analytics': 'Analytics',
  '/team': 'Team',
  '/email/templates': 'Email Templates',
  '/automations': 'Automations',
  '/settings': 'Settings',
};

export default function TopBar() {
  const location = useLocation();
  const basePath = '/' + location.pathname.split('/').filter(Boolean).slice(0, 2).join('/');
  const title = pageTitles[basePath] || pageTitles['/' + location.pathname.split('/')[1]] || 'CloudRealty CRM';

  return (
    <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search... (Ctrl+K)"
          className="bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-gray-300 placeholder-gray-500 w-64 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>
    </header>
  );
}
