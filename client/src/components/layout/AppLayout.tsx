import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, Plus, Wrench, Package, Factory, Monitor } from 'lucide-react';
import QuickAddJobModal from '../jobs/QuickAddJobModal';

export default function AppLayout() {
  const location = useLocation();
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Jobs', href: '/jobs', icon: Briefcase },
    { name: 'Engineering', href: '/engineering', icon: Wrench },
    { name: 'Supply Chain', href: '/supply-chain', icon: Package },
    { name: 'Production', href: '/production', icon: Factory },
    { name: 'Station Kiosks', href: '/station-kiosks', icon: Monitor },
    { name: 'Clients', href: '/clients', icon: Users },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-rivian-black">
      {/* Sidebar */}
      <aside className="w-64 bg-rivian-soft-black border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold text-rivian-accent">CAPSULE</h1>
          <p className="text-sm text-gray-400 mt-1">Manufacturing ERP</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${
                    active
                      ? 'bg-rivian-accent text-white'
                      : 'text-gray-300 hover:bg-rivian-hover hover:text-white'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="text-xs text-gray-500">
            <p>v1.0.0</p>
            <p className="mt-1">© 2025 Capsule ERP</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-rivian-soft-black border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {navigation.find((item) => isActive(item.href))?.name || 'Capsule ERP'}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsAddJobModalOpen(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Job
              </button>

              <div className="w-10 h-10 rounded-full bg-rivian-accent flex items-center justify-center">
                <span className="text-sm font-semibold">AD</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Quick Add Job Modal */}
      <QuickAddJobModal
        isOpen={isAddJobModalOpen}
        onClose={() => setIsAddJobModalOpen(false)}
      />
    </div>
  );
}
