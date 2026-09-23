import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileCheck,
  History,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ViewTab } from '../types';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, config } = useApp();

  const navItems: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Inicio', icon: <LayoutDashboard size={20} /> },
    { id: 'colaboradores', label: 'Colaboradores', icon: <Users size={20} /> },
    { id: 'generar', label: 'Generar Cuentas', icon: <FileCheck size={20} /> },
    { id: 'historial', label: 'Historial', icon: <History size={20} /> },
    { id: 'configuracion', label: 'Configuración', icon: <Settings size={20} /> },
  ];

  return (
    <aside className="w-64 bg-[#0b132b] text-slate-300 flex flex-col h-screen border-r border-slate-800 select-none flex-shrink-0">
      {/* Cabecera / Identidad */}
      <div className="p-5 flex items-center gap-3 border-b border-slate-800/80">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30 flex-shrink-0">
          <ShieldCheck size={22} />
        </div>
        <div className="overflow-hidden">
          <h1 className="font-bold text-white text-base leading-tight truncate">
            {config.NombreLegalFundacion || 'Fundación'}
          </h1>
          <p className="text-xs text-emerald-400 font-medium truncate">
            Gestión de Cuentas
          </p>
        </div>
      </div>

      {/* Navegación Principal */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-950/40 translate-x-1'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-slate-400'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Pie del Sidebar / Estado del Sistema */}
      <div className="p-4 border-t border-slate-800/80 text-xs text-slate-500 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span>Versión 1.0.0</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-emerald-400">
            Escritorio
          </span>
        </div>
        <p className="text-[11px] text-slate-500 truncate">
          Costo Infraestructura: <strong className="text-emerald-500 font-normal">$0</strong>
        </p>
      </div>
    </aside>
  );
};

