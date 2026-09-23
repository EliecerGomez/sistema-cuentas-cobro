import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  ExternalLink,
  RefreshCw,
  FileCheck2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrencyCOP } from '../utils/currency';
import { formatDateDMY } from '../utils/dates';

export const HistorialView: React.FC = () => {
  const { historial, refreshHistorial } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshHistorial();
    setIsRefreshing(false);
  };

  const filteredHistorial = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return historial;

    return historial.filter(h =>
      h.colaborador.toLowerCase().includes(q) ||
      h.cedula.toLowerCase().includes(q) ||
      h.consecutivo.toLowerCase().includes(q) ||
      h.nombreArchivo.toLowerCase().includes(q)
    );
  }, [historial, searchTerm]);

  // Apertura segura de URL de Drive
  const handleOpenDriveUrl = (url: string) => {
    if (!url) return;
    if ((window as any).electronAPI && typeof (window as any).electronAPI.openExternal === 'function') {
      (window as any).electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Encabezado y Barra de Búsqueda */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <History size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Historial de Cuentas Generadas</h3>
            <p className="text-xs text-slate-500">Trazabilidad oficial de todas las cuentas emitidas y sincronizadas con Google Drive.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por colaborador o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Recargar historial"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-indigo-600' : ''} />
          </button>
        </div>
      </div>

      {/* Tabla del Historial */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h4 className="font-bold text-slate-800 text-sm">
            Registros Históricos ({filteredHistorial.length})
          </h4>
        </div>

        {filteredHistorial.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <FileCheck2 size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">No se encontraron registros de cuentas generadas.</p>
            <p className="text-xs text-slate-400 mt-1">Genera cuentas de cobro desde el menú "Generar Cuentas" para verlas aquí.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Consecutivo</th>
                  <th className="px-5 py-3">Colaborador</th>
                  <th className="px-5 py-3">Cédula</th>
                  <th className="px-5 py-3">Periodo</th>
                  <th className="px-5 py-3 text-right">Valor</th>
                  <th className="px-5 py-3">Fecha Generación</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-center">Acceso PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistorial.map(item => {
                  const hasDriveUrl = Boolean(item.driveUrl && item.driveUrl.trim());
                  const isErrorDrive = item.estado === 'Error en Drive';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-emerald-800">
                        N° {item.consecutivo}
                      </td>

                      <td className="px-5 py-3.5 font-medium text-slate-900">
                        {item.colaborador}
                      </td>

                      <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">
                        {item.cedula}
                      </td>

                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        {formatDateDMY(item.periodoInicio)} al {formatDateDMY(item.periodoFin)}
                      </td>

                      <td className="px-5 py-3.5 font-bold text-slate-800 text-right">
                        {formatCurrencyCOP(item.valor)}
                      </td>

                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {formatDateDMY(item.fechaGeneracion)}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            isErrorDrive
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {item.estado}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        {hasDriveUrl ? (
                          <button
                            onClick={() => handleOpenDriveUrl(item.driveUrl)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                          >
                            <ExternalLink size={12} />
                            <span>Abrir PDF</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Sin URL en Drive
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
