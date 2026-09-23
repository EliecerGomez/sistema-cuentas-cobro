import React from 'react';
import {
  Users,
  UserCheck,
  FileCheck2,
  Calendar,
  UserPlus,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrencyCOP } from '../utils/currency';
import { formatDateDMY } from '../utils/dates';

export const DashboardView: React.FC = () => {
  const { colaboradores, historial, setActiveTab, config } = useApp();

  // Métricas
  const totalColaboradores = colaboradores.length;
  const colaboradoresActivos = colaboradores.filter(c => c.estado === 'Activo').length;
  const totalCuentasGeneradas = historial.length;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const cuentasEsteMes = historial.filter(h => {
    if (!h.fechaGeneracion) return false;
    const d = new Date(h.fechaGeneracion);
    return d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
  }).length;

  const ultimasCuentas = historial.slice(0, 5);

  const kpis = [
    {
      title: 'Total Colaboradores',
      value: totalColaboradores,
      icon: <Users size={22} className="text-blue-600" />,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      subtext: 'Registrados en base de datos',
    },
    {
      title: 'Colaboradores Activos',
      value: colaboradoresActivos,
      icon: <UserCheck size={22} className="text-emerald-600" />,
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
      subtext: 'Disponibles para cobro',
    },
    {
      title: 'Cuentas Generadas',
      value: totalCuentasGeneradas,
      icon: <FileCheck2 size={22} className="text-indigo-600" />,
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
      subtext: 'Total histórico registrado',
    },
    {
      title: 'Cuentas de Este Mes',
      value: cuentasEsteMes,
      icon: <Calendar size={22} className="text-teal-600" />,
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-100',
      subtext: 'Generadas este periodo',
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Saludo y Encabezado de Bienvenida */}
      <div className="bg-gradient-to-r from-[#0b132b] via-slate-900 to-emerald-950 p-7 rounded-2xl text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck size={16} />
            <span>Sistema Administrativo Institucional</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {config.NombreLegalFundacion || 'Fundación Hogar Geriátrico Mis Años Dorados'}
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Gestión centralizada de colaboradores, generación de cuentas de cobro oficiales y sincronización automática en la nube sin costo de infraestructura.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('generar')}
          className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm shadow-lg shadow-emerald-900/40 flex items-center gap-2 transition-all flex-shrink-0"
        >
          <FileCheck2 size={18} />
          <span>Generar Cuentas</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Tarjetas de Métricas (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {kpi.title}
              </span>
              <div className={`p-2.5 rounded-xl border ${kpi.bgColor} ${kpi.borderColor}`}>
                {kpi.icon}
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-slate-800 tracking-tight">
                {kpi.value}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              {kpi.subtext}
            </p>
          </div>
        ))}
      </div>

      {/* Accesos Rápidos */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
          Accesos Rápidos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab('colaboradores')}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 text-left transition-all group shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                <UserPlus size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">Gestionar Colaboradores</h4>
                <p className="text-xs text-slate-500">Crear o editar registros</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => setActiveTab('generar')}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 text-left transition-all group shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                <FileCheck2 size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">Generador de Cuentas</h4>
                <p className="text-xs text-slate-500">Emisión masiva en PDF</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => setActiveTab('historial')}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 text-left transition-all group shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                <TrendingUp size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">Ver Historial</h4>
                <p className="text-xs text-slate-500">Cuentas emitidas y Drive</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => setActiveTab('configuracion')}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 text-left transition-all group shadow-sm flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">Configuración</h4>
                <p className="text-xs text-slate-500">Datos legales y Google IDs</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>

      {/* Sección de Últimas Cuentas Generadas */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Últimas Cuentas Generadas</h3>
            <p className="text-xs text-slate-500">Registro reciente de cuentas de cobro generadas</p>
          </div>
          <button
            onClick={() => setActiveTab('historial')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>Ver todo el historial</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {ultimasCuentas.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <FileCheck2 size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">Aún no se han generado cuentas de cobro.</p>
            <p className="text-xs text-slate-400 mt-1">Usa la opción "Generar Cuentas" para emitir las primeras del periodo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Consecutivo</th>
                  <th className="px-6 py-3">Colaborador</th>
                  <th className="px-6 py-3">Cédula</th>
                  <th className="px-6 py-3">Periodo</th>
                  <th className="px-6 py-3 text-right">Valor</th>
                  <th className="px-6 py-3 text-center">Acceso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ultimasCuentas.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-emerald-700">
                      N° {item.consecutivo}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-800">
                      {item.colaborador}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {item.cedula}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-500">
                      {formatDateDMY(item.periodoInicio)} al {formatDateDMY(item.periodoFin)}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-800 text-right">
                      {formatCurrencyCOP(item.valor)}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {item.driveUrl ? (
                        <a
                          href={item.driveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors"
                        >
                          <ExternalLink size={12} />
                          <span>Abrir Drive</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">Generado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

