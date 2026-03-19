import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  SquaresFour,
  Briefcase,
  Users,
  Plus,
  Wrench,
  Package,
  Factory,
  Monitor,
  UserCircle,
  SignOut,
  Shield,
  ClipboardText,
  ChartBar,
  ChartLineUp,
  CalendarBlank,
} from '@phosphor-icons/react';
import { useAuthContext } from '../../contexts/AuthContext';
import QuickAddJobModal from '../jobs/QuickAddJobModal';
import type { UserRole } from '../../../../shared/types';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles?: UserRole[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: SquaresFour },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Engineering', href: '/engineering', icon: Wrench, roles: ['admin', 'manager', 'engineer'] },
  { name: 'Supply Chain', href: '/supply-chain', icon: Package, roles: ['admin', 'manager', 'engineer'] },
  { name: 'Production', href: '/production', icon: Factory, roles: ['admin', 'manager'] },
  { name: 'Prod Dashboard', href: '/dashboard/production', icon: ChartBar, roles: ['admin', 'manager'] },
  { name: 'Scheduling', href: '/scheduling', icon: CalendarBlank, roles: ['admin', 'manager'] },
  { name: 'Station Kiosks', href: '/station-kiosks', icon: Monitor, roles: ['admin', 'manager'] },
  { name: 'Clients', href: '/clients', icon: Users, roles: ['admin', 'manager'] },
  { name: 'Reports', href: '/reports', icon: ChartLineUp, roles: ['admin', 'manager'] },
];

const adminNavigation: NavItem[] = [
  { name: 'Users', href: '/admin/users', icon: Shield, roles: ['admin'] },
  { name: 'Audit Log', href: '/admin/audit-log', icon: ClipboardText, roles: ['admin', 'manager'] },
];

export default function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuthContext();
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const visibleNav = navigation.filter(item =>
    !item.roles || (user && item.roles.includes(user.role))
  );

  const visibleAdmin = adminNavigation.filter(item =>
    !item.roles || (user && item.roles.includes(user.role))
  );

  const currentPage = [...navigation, ...adminNavigation].find(item => isActive(item.href))?.name || 'Capsule ERP';

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-[220px] bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-100">
          <h1 className="text-sm font-semibold tracking-tight text-gray-900">CAPSULE</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Manufacturing ERP</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-sm ${
                  active
                    ? 'bg-gray-900 text-white font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={18} weight="light" />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {visibleAdmin.length > 0 && (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Admin</p>
              </div>
              {visibleAdmin.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-sm ${
                      active
                        ? 'bg-gray-900 text-white font-medium'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={18} weight="light" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <UserCircle size={32} weight="regular" className="text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'Loading...'}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role || ''}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 w-full transition-colors"
          >
            <SignOut size={16} weight="regular" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-6 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">{currentPage}</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAddJobModalOpen(true)}
                className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-3 py-1.5 rounded-[10px] flex items-center gap-2 transition-colors active:scale-[0.98]"
              >
                <Plus size={16} />
                New Job
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 animate-fadeIn">
          <Outlet />
        </main>
      </div>

      <QuickAddJobModal
        isOpen={isAddJobModalOpen}
        onClose={() => setIsAddJobModalOpen(false)}
      />
    </div>
  );
}
