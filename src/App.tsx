import React from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ToastContainer } from './components/ToastContainer';
import { useApp } from './context/AppContext';
import { DashboardView } from './views/DashboardView';
import { ColaboradoresView } from './views/ColaboradoresView';
import { GeneradorCuentasView } from './views/GeneradorCuentasView';
import { HistorialView } from './views/HistorialView';
import { ConfiguracionView } from './views/ConfiguracionView';

export const App: React.FC = () => {
  const { activeTab } = useApp();

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard Administrativo';
      case 'colaboradores':
        return 'Base de Datos de Colaboradores';
      case 'generar':
        return 'Cuentas de Cobro Generadas';
      case 'historial':
        return 'Historial Oficial de Cuentas';
      case 'configuracion':
        return 'Configuración del Sistema';
      default:
        return 'Sistema Administrativo';
    }
  };

  const renderCurrentView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'colaboradores':
        return <ColaboradoresView />;
      case 'generar':
        return <GeneradorCuentasView />;
      case 'historial':
        return <HistorialView />;
      case 'configuracion':
        return <ConfiguracionView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Sidebar Fijo Izquierdo */}
      <Sidebar />

      {/* Área Principal con TopBar y Contenedor de Vistas */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <TopBar title={getTitle()} />

        <main className="flex-1 overflow-y-auto bg-[#f8fafc]">
          {renderCurrentView()}
        </main>
      </div>

      {/* Contenedor Flotante de Notificaciones */}
      <ToastContainer />
    </div>
  );
};

export default App;

