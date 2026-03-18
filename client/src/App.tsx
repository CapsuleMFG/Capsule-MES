import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ui/ToastContainer';
import { AuthProvider } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './components/auth/LoginPage';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Clients from './pages/Clients';
import Engineering from './pages/Engineering';
import SupplyChain from './pages/SupplyChain';
import Production from './pages/Production';
import PartsTracking from './pages/PartsTracking';
import PartDetail from './pages/PartDetail';
import RouteTemplates from './pages/RouteTemplates';
import StationKiosks from './pages/StationKiosks';
import UserManagement from './pages/UserManagement';
import AuditLogPage from './pages/AuditLog';
import { KioskProvider } from './contexts/KioskContext';
import StationLogin from './pages/kiosk/StationLogin';
import MachineSelect from './pages/kiosk/MachineSelect';
import StationDashboard from './pages/kiosk/StationDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />

              {/* Kiosk routes — standalone, no sidebar, no auth required */}
              <Route path="/kiosk" element={<KioskProvider><StationLogin /></KioskProvider>} />
              <Route path="/kiosk/machine" element={<KioskProvider><MachineSelect /></KioskProvider>} />
              <Route path="/kiosk/station" element={<KioskProvider><StationDashboard /></KioskProvider>} />

              {/* Main app routes — protected */}
              <Route path="/" element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="jobs/:id" element={<JobDetail />} />
                <Route path="engineering" element={<Engineering />} />
                <Route path="supply-chain" element={<SupplyChain />} />
                <Route path="production" element={<Production />} />
                <Route path="parts" element={<PartsTracking />} />
                <Route path="parts/:id" element={<PartDetail />} />
                <Route path="route-templates" element={<RouteTemplates />} />
                <Route path="station-kiosks" element={<StationKiosks />} />
                <Route path="clients" element={<Clients />} />
                <Route path="admin/users" element={
                  <ProtectedRoute roles={['admin']}>
                    <UserManagement />
                  </ProtectedRoute>
                } />
                <Route path="admin/audit-log" element={
                  <ProtectedRoute roles={['admin', 'manager']}>
                    <AuditLogPage />
                  </ProtectedRoute>
                } />
              </Route>
            </Routes>
            <ToastContainer />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
