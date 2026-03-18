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
} from '@phosphor-icons/react';
import QuickAddJobModal from '../jobs/QuickAddJobModal';

export default function AppLayout() {
  const location = useLocation();
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: SquaresFour },
    { name: 'Jobs', href: '/jobs', icon: Briefcase },
    { name: 'Engineering', href: '/engineering', icon: Wrench },
    { name: 'Supply Chain', href: '/supply-chain', icon: Package },
    { name: 'Production', href: '/production', icon: Factory },
    { name: 'Station Kiosks', href: '/station-kiosks', icon: Monitor },
    { name: 'Clients', href: '/clients', icon: Users },
  ];

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-[220px] bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-100">
          <h1 className="text-sm font-semibold tracking-tight text-gray-900">CAPSULE</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Manufacturing ERP</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-sm
                  ${
                    active
                      ? 'bg-gray-900 text-white font-medium'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon size={18} weight="light" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="text-[11px] text-gray-400">
            <p>v1.0.0</p>
            <p className="mt-1">&copy; 2025 Capsule ERP</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">
              {navigation.find((item) => isActive(item.href))?.name || 'Capsule ERP'}
            </h2>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAddJobModalOpen(true)}
                className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-3 py-1.5 rounded-[10px] flex items-center gap-2 transition-colors active:scale-[0.98]"
              >
                <Plus size={16} />
                New Job
              </button>

              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">AD</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
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
