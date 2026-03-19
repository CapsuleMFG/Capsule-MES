import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface KioskState {
  stationName: string;
  kioskId: number;
  machineId?: number;
  machineName?: string;
  userId?: string;
  userName?: string;
}

interface KioskContextType {
  station: KioskState | null;
  login: (stationName: string, kioskId: number, userId?: string, userName?: string) => void;
  selectMachine: (machineId: number, machineName: string) => void;
  clearMachine: () => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const KioskContext = createContext<KioskContextType | undefined>(undefined);

const STORAGE_KEY = 'capsule_kiosk_station';

export function KioskProvider({ children }: { children: ReactNode }) {
  const [station, setStation] = useState<KioskState | null>(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
  });

  const navigate = useNavigate();
  const location = useLocation();

  const login = useCallback((stationName: string, kioskId: number, userId?: string, userName?: string) => {
    const state: KioskState = { stationName, kioskId, userId, userName };
    setStation(state);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    navigate('/kiosk/machine');
  }, [navigate]);

  const selectMachine = useCallback((machineId: number, machineName: string) => {
    setStation(prev => {
      if (!prev) return null;
      const updated = { ...prev, machineId, machineName };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    navigate('/kiosk/station');
  }, [navigate]);

  const clearMachine = useCallback(() => {
    setStation(prev => {
      if (!prev) return null;
      const { machineId: _, machineName: __, ...rest } = prev;
      const updated = rest as KioskState;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    navigate('/kiosk/machine');
  }, [navigate]);

  const logout = useCallback(() => {
    setStation(null);
    sessionStorage.removeItem(STORAGE_KEY);
    navigate('/kiosk');
  }, [navigate]);

  // Redirect logic
  useEffect(() => {
    const path = location.pathname;
    if (!station && (path === '/kiosk/station' || path === '/kiosk/machine')) {
      navigate('/kiosk');
    } else if (station && !station.machineId && path === '/kiosk/station') {
      navigate('/kiosk/machine');
    }
  }, [station, location.pathname, navigate]);

  return (
    <KioskContext.Provider value={{ station, login, selectMachine, clearMachine, logout, isAuthenticated: !!station }}>
      {children}
    </KioskContext.Provider>
  );
}

export function useKiosk() {
  const context = useContext(KioskContext);
  if (!context) {
    throw new Error('useKiosk must be used within a KioskProvider');
  }
  return context;
}
