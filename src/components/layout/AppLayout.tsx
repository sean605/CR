import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useUIStore } from '../../stores/uiStore';
import clsx from 'clsx';

export default function AppLayout({ children }: { children: ReactNode }) {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-navy-900">
      <Sidebar />
      <div
        className={clsx(
          'transition-all duration-200',
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        )}
      >
        <TopBar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
