import React from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface TopBarProps {
  title: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title }) => {
  const { isOnline, isSyncing, refreshColaboradores, refreshHistorial } = useApp();

  const handleSync = async () => {
    await Promise.all([refreshColaboradores(), refreshHistorial()]);
  };

  const currentDateFormatted = new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Indicador de Estado de Conexión / Sincronización */}
        {isOnline ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
            <Cloud size={14} className="text-emerald-600" />
            <span>Sheets Sincronizado</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-medium border border-amber-200">
            <CloudOff size={14} className="text-amber-600" />
            <span>Modo Local / Sin Conexión</span>
          </div>
        )}

        {/* Botón de Sincronización Manual */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          title="Sincronizar datos"
          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={isSyncing ? 'animate-spin text-emerald-600' : ''} />
        </button>

        {/* Fecha Actual */}
        <div className="text-xs text-slate-500 border-l border-slate-200 pl-3 hidden sm:block">
          {currentDateFormatted}
        </div>
      </div>
    </header>
  );
};

