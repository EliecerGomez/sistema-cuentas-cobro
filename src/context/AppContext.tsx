import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Colaborador,
  ConfiguracionFundacion,
  HistorialCuenta,
  PeriodoFacturacion,
  ToastMessage,
  ViewTab
} from '../types';
import { api, DEFAULT_CONFIG } from '../services/api';
import { getDefaultPeriodDates } from '../utils/dates';

interface AppContextType {
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  colaboradores: Colaborador[];
  config: ConfiguracionFundacion;
  historial: HistorialCuenta[];
  periodo: PeriodoFacturacion;
  setPeriodo: React.Dispatch<React.SetStateAction<PeriodoFacturacion>>;
  isOnline: boolean;
  isSyncing: boolean;
  toasts: ToastMessage[];
  addToast: (tipo: ToastMessage['tipo'], mensaje: string) => void;
  removeToast: (id: string) => void;
  refreshColaboradores: () => Promise<void>;
  refreshHistorial: () => Promise<void>;
  saveColaborador: (data: Partial<Colaborador>) => Promise<Colaborador>;
  deactivateColaborador: (id: string) => Promise<void>;
  saveConfig: (data: ConfiguracionFundacion) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard');
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [config, setConfig] = useState<ConfiguracionFundacion>(DEFAULT_CONFIG);
  const [historial, setHistorial] = useState<HistorialCuenta[]>([]);
  const [periodo, setPeriodo] = useState<PeriodoFacturacion>(() => {
    const d = getDefaultPeriodDates();
    return { fechaInicio: d.inicio, fechaFin: d.fin };
  });
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Notificaciones Toast
  const addToast = useCallback((tipo: ToastMessage['tipo'], mensaje: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts(prev => [...prev, { id, tipo, mensaje }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Monitor de Conexión a Internet
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addToast('info', 'Conexión a Internet restablecida.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      addToast('warning', 'Sin conexión a Internet. Los cambios se guardarán localmente.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addToast]);

  // Cargar Colaboradores
  const refreshColaboradores = useCallback(async () => {
    setIsSyncing(true);
    try {
      const data = await api.getColaboradores();
      setColaboradores(data);
    } catch (err: any) {
      addToast('error', 'Error al sincronizar colaboradores: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [addToast]);

  // Cargar Historial
  const refreshHistorial = useCallback(async () => {
    try {
      const data = await api.getHistorial();
      setHistorial(data);
    } catch (err: any) {
      console.warn('Error al obtener historial:', err.message);
    }
  }, []);

  // Cargar Configuración
  const refreshConfig = useCallback(async () => {
    try {
      const data = await api.getConfiguracion();
      setConfig(data);
    } catch (err: any) {
      console.warn('Error al obtener configuración:', err.message);
    }
  }, []);

  // Inicialización de la aplicación
  useEffect(() => {
    refreshConfig();
    refreshColaboradores();
    refreshHistorial();
  }, [refreshConfig, refreshColaboradores, refreshHistorial]);

  // Guardar/Actualizar Colaborador
  const saveColaborador = async (data: Partial<Colaborador>): Promise<Colaborador> => {
    setIsSyncing(true);
    try {
      const saved = await api.saveColaborador(data);
      setColaboradores(prev => {
        const idx = prev.findIndex(c => c.id === saved.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [...prev, saved];
      });
      addToast('success', `Colaborador "${saved.nombre}" guardado correctamente.`);
      return saved;
    } catch (err: any) {
      addToast('error', 'Error al guardar colaborador: ' + err.message);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Desactivar Colaborador
  const deactivateColaborador = async (id: string): Promise<void> => {
    setIsSyncing(true);
    try {
      await api.deactivateColaborador(id);
      setColaboradores(prev =>
        prev.map(c => (c.id === id ? { ...c, estado: 'Inactivo' } : c))
      );
      addToast('info', 'Colaborador desactivado.');
    } catch (err: any) {
      addToast('error', 'Error al desactivar colaborador: ' + err.message);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Guardar Configuración
  const saveConfig = async (data: ConfiguracionFundacion): Promise<void> => {
    setIsSyncing(true);
    try {
      await api.saveConfiguracion(data);
      setConfig(data);
      addToast('success', 'Configuración institucional guardada.');
    } catch (err: any) {
      addToast('error', 'Error al guardar configuración: ' + err.message);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        colaboradores,
        config,
        historial,
        periodo,
        setPeriodo,
        isOnline,
        isSyncing,
        toasts,
        addToast,
        removeToast,
        refreshColaboradores,
        refreshHistorial,
        saveColaborador,
        deactivateColaborador,
        saveConfig,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser utilizado dentro de un AppProvider');
  }
  return context;
};

