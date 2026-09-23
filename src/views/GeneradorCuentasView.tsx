import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  ExternalLink,
  Loader2,
  FileDown,
  ArrowLeft,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Colaborador, ItemResultadoGeneracion, ResumenGeneracion } from '../types';
import { formatCurrencyCOP, isValidCurrencyCOP } from '../utils/currency';
import { formatDateDMY, validateDateRange, getMonthYearSpanish } from '../utils/dates';
import { generarCuentaCobroCompletaPdf } from '../services/pdfGenerator';
import { api } from '../services/api';
import { Modal } from '../components/Modal';

export const GeneradorCuentasView: React.FC = () => {
  const {
    colaboradores,
    periodo,
    setPeriodo,
    config,
    refreshHistorial,
    setActiveTab,
    addToast
  } = useApp();

  // Solo colaboradores activos para la selección
  const colaboradoresActivos = useMemo(() => {
    return colaboradores.filter(c => c.estado === 'Activo');
  }, [colaboradores]);

  // IDs de colaboradores seleccionados
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    return colaboradoresActivos.map(c => c.id);
  });

  // Opción para consolidar soportes (Cédula, RUT, Diploma) en el PDF final
  const [unirSoportes, setUnirSoportes] = useState<boolean>(true);

  // Estado de Generación en Progreso
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progresoTexto, setProgresoTexto] = useState<string>('');
  const [progresoPorcentaje, setProgresoPorcentaje] = useState<number>(0);

  // Resumen Final de Generación
  const [resumen, setResumen] = useState<ResumenGeneracion | null>(null);

  // Modal de advertencia por duplicados encontrados
  const [duplicadosDetectados, setDuplicadosDetectados] = useState<{
    colaborador: Colaborador;
    match: any;
  }[]>([]);
  const [showDuplicadosModal, setShowDuplicadosModal] = useState<boolean>(false);

  // Manejo de Selección
  const handleToggleSelectAll = () => {
    if (selectedIds.length === colaboradoresActivos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(colaboradoresActivos.map(c => c.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Validar y ejecutar generación
  const handleIniciarGeneracion = async (omitirRevisionDuplicados: boolean = false) => {
    // 1. Validar Fechas
    const dateCheck = validateDateRange(periodo.fechaInicio, periodo.fechaFin);
    if (!dateCheck.valid) {
      addToast('error', dateCheck.error || 'Fechas de periodo inválidas');
      return;
    }

    // 2. Validar Selección
    if (selectedIds.length === 0) {
      addToast('warning', 'Selecciona al menos un colaborador para generar su cuenta de cobro.');
      return;
    }

    const colabsToProcess = colaboradoresActivos.filter(c => selectedIds.includes(c.id));

    // 3. Comprobar posibles duplicados si no se ha omitido la revisión
    if (!omitirRevisionDuplicados) {
      const dups: { colaborador: Colaborador; match: any }[] = [];
      for (const c of colabsToProcess) {
        const check = await api.checkDuplicate(
          c.nombre,
          periodo.fechaInicio,
          periodo.fechaFin,
          c.consecutivo
        );
        if (check.exists) {
          dups.push({ colaborador: c, match: check.match });
        }
      }

      if (dups.length > 0) {
        setDuplicadosDetectados(dups);
        setShowDuplicadosModal(true);
        return;
      }
    }

    // Cerrar modal de duplicados si estaba abierto
    setShowDuplicadosModal(false);

    // 4. Iniciar Proceso de Generación
    setIsGenerating(true);
    setResumen(null);
    setProgresoTexto('Preparando generación...');
    setProgresoPorcentaje(5);

    const total = colabsToProcess.length;
    const itemsResult: ItemResultadoGeneracion[] = [];
    let exitosas = 0;
    let errores = 0;

    const { year, monthName, monthNumber } = getMonthYearSpanish(periodo.fechaFin);

    for (let i = 0; i < total; i++) {
      const c = colabsToProcess[i];
      const stepIndex = i + 1;
      setProgresoTexto(`Generando ${stepIndex} de ${total}: ${c.nombre}...`);
      setProgresoPorcentaje(Math.round(((i + 0.5) / total) * 100));

      // Validación preventiva individual
      if (!c.nombre.trim()) {
        errores++;
        itemsResult.push({
          colaboradorId: c.id,
          nombre: c.nombre || 'Sin nombre',
          cedula: c.cedula,
          consecutivo: c.consecutivo,
          exito: false,
          error: 'Nombre completo vacío.',
        });
        continue;
      }

      if (!c.cedula.trim()) {
        errores++;
        itemsResult.push({
          colaboradorId: c.id,
          nombre: c.nombre,
          cedula: c.cedula,
          consecutivo: c.consecutivo,
          exito: false,
          error: 'Cédula de ciudadanía ausente o inválida.',
        });
        continue;
      }

      if (!c.cargo.trim()) {
        errores++;
        itemsResult.push({
          colaboradorId: c.id,
          nombre: c.nombre,
          cedula: c.cedula,
          consecutivo: c.consecutivo,
          exito: false,
          error: 'Cargo o concepto de pago ausente.',
        });
        continue;
      }

      if (!isValidCurrencyCOP(c.valor)) {
        errores++;
        itemsResult.push({
          colaboradorId: c.id,
          nombre: c.nombre,
          cedula: c.cedula,
          consecutivo: c.consecutivo,
          exito: false,
          error: 'Valor a pagar inválido o menor a cero.',
        });
        continue;
      }

      try {
        // Generar PDF con plantilla institucional y soportes unificados si está activo
        const pdfOutput = await generarCuentaCobroCompletaPdf({
          colaborador: c,
          config,
          periodo,
          unirSoportes,
        });

        let driveUrl = '';
        let driveFileId = '';
        let estadoHistorial: 'Generado' | 'Error en Drive' = 'Generado';
        let driveWarning = '';

        // Subida a Google Drive si está configurado y hay conexión
        if (config.GoogleWebAppUrl && navigator.onLine) {
          try {
            setProgresoTexto(`Subiendo a Google Drive: ${c.nombre}...`);
            const driveRes = await api.uploadPdfToDrive({
              base64Content: pdfOutput.base64,
              fileName: pdfOutput.filename,
              year,
              monthName,
              monthNumber,
              rootFolderId: config.CarpetaDrivePrincipal,
            });
            driveUrl = driveRes.driveUrl || driveRes.downloadUrl;
            driveFileId = driveRes.fileId;
          } catch (driveErr: any) {
            console.warn('Fallo al subir a Google Drive:', driveErr.message);
            estadoHistorial = 'Error en Drive';
            driveWarning = ' (PDF generado localmente, pero falló la subida a Drive)';
          }
        }

        // Registrar en Historial
        await api.recordHistorial({
          colaborador: c.nombre,
          cedula: c.cedula,
          periodoInicio: periodo.fechaInicio,
          periodoFin: periodo.fechaFin,
          consecutivo: c.consecutivo,
          valor: c.valor,
          nombreArchivo: pdfOutput.filename,
          driveFileId: driveFileId,
          driveUrl: driveUrl,
          estado: estadoHistorial,
        });

        exitosas++;
        itemsResult.push({
          colaboradorId: c.id,
          nombre: c.nombre,
          cedula: c.cedula,
          consecutivo: c.consecutivo,
          exito: true,
          driveUrl: driveUrl || undefined,
          nombreArchivo: pdfOutput.filename,
          pdfBlob: pdfOutput.blob,
          error: driveWarning ? driveWarning : undefined,
        });
      } catch (genErr: any) {
        errores++;
        itemsResult.push({
          colaboradorId: c.id,
          nombre: c.nombre,
          cedula: c.cedula,
          consecutivo: c.consecutivo,
          exito: false,
          error: genErr.message || 'Error inesperado al generar PDF',
        });
      }

      setProgresoPorcentaje(Math.round(((i + 1) / total) * 100));
    }

    setIsGenerating(false);
    setResumen({
      total,
      generadas: exitosas,
      errores,
      items: itemsResult,
    });

    await refreshHistorial();
    addToast(
      errores === 0 ? 'success' : 'warning',
      `Generación finalizada: ${exitosas} generadas, ${errores} con errores.`
    );
  };

  // Descargar un PDF individualmente
  const handleDescargarIndividual = (item: ItemResultadoGeneracion) => {
    if (!item.pdfBlob) return;
    const url = URL.createObjectURL(item.pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.nombreArchivo || `${item.consecutivo || '001'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Descargar masivamente todos los PDFs generados en esta sesión
  const handleDescargarTodos = () => {
    if (!resumen) return;
    const exitosos = resumen.items.filter(it => it.exito && it.pdfBlob);
    exitosos.forEach((it, idx) => {
      setTimeout(() => {
        handleDescargarIndividual(it);
      }, idx * 250); // Ligero retardo para no saturar el navegador
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Barra superior de navegación interna */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveTab('colaboradores')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Volver a Base de Datos</span>
        </button>

        {resumen && (
          <button
            onClick={handleDescargarTodos}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Download size={15} />
            <span>Descargar Masivamente (Individuales)</span>
          </button>
        )}
      </div>

      {/* Configuración de Periodo de Generación */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Periodo de Facturación</h3>
            <p className="text-xs text-slate-500">Define las fechas que se plasmarán en la cuenta de cobro oficial.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">Inicio:</label>
            <input
              type="date"
              value={periodo.fechaInicio}
              onChange={(e) => setPeriodo(prev => ({ ...prev, fechaInicio: e.target.value }))}
              disabled={isGenerating}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">Fin:</label>
            <input
              type="date"
              value={periodo.fechaFin}
              onChange={(e) => setPeriodo(prev => ({ ...prev, fechaFin: e.target.value }))}
              disabled={isGenerating}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={unirSoportes}
                onChange={(e) => setUnirSoportes(e.target.checked)}
                disabled={isGenerating}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <span>📎 Unir soportes al PDF</span>
                <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">CC, RUT, Diploma</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Panel de Progreso Activo */}
      {isGenerating && (
        <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-md space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <Loader2 size={18} className="animate-spin text-emerald-600" />
              <span>{progresoTexto}</span>
            </div>
            <span className="text-xs font-extrabold text-emerald-700">
              {progresoPorcentaje}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progresoPorcentaje}%` }}
            />
          </div>
        </div>
      )}

      {/* Resumen de Generación Finalizada */}
      {resumen && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">GENERACIÓN COMPLETADA</h3>
              <p className="text-xs text-slate-500">Resultado detallado por colaborador</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700">
                Total: {resumen.total}
              </span>
              <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                Generadas: {resumen.generadas}
              </span>
              {resumen.errores > 0 && (
                <span className="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                  Errores: {resumen.errores}
                </span>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {resumen.items.map((it, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2.5">
                  {it.exito ? (
                    <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                  ) : (
                    <XCircle size={18} className="text-rose-600 flex-shrink-0" />
                  )}
                  <div>
                    <span className="font-medium text-slate-800">{it.nombre}</span>
                    <span className="text-xs text-slate-500 ml-2">C.C. {it.cedula}</span>
                    {it.error && (
                      <span className="text-xs text-rose-600 block mt-0.5 font-medium">
                        — {it.error}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {it.driveUrl && (
                    <a
                      href={it.driveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    >
                      <ExternalLink size={12} />
                      <span>Ver en Drive</span>
                    </a>
                  )}
                  {it.exito && (
                    <button
                      onClick={() => handleDescargarIndividual(it)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      <FileDown size={12} />
                      <span>Descargar</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Colaboradores con Checkbox */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={colaboradoresActivos.length > 0 && selectedIds.length === colaboradoresActivos.length}
                onChange={handleToggleSelectAll}
                disabled={isGenerating || colaboradoresActivos.length === 0}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Seleccionar todos</span>
            </label>
            <span className="text-xs text-slate-500 font-medium border-l border-slate-200 pl-3">
              {selectedIds.length} colaboradores seleccionados
            </span>
          </div>

          <button
            onClick={() => handleIniciarGeneracion(false)}
            disabled={isGenerating || selectedIds.length === 0}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-900/30 flex items-center gap-2 transition-all disabled:opacity-50 disabled:shadow-none"
          >
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileCheck2 size={16} />
            )}
            <span>GENERAR CUENTAS DE COBRO</span>
          </button>
        </div>

        {colaboradoresActivos.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <AlertTriangle size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">No hay colaboradores activos disponibles.</p>
            <p className="text-xs text-slate-400 mt-1">Activa o registra colaboradores en la sección correspondiente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="w-12 px-6 py-3 text-center"></th>
                  <th className="px-6 py-3">N° Cuenta</th>
                  <th className="px-6 py-3">Colaborador</th>
                  <th className="px-6 py-3">Cédula</th>
                  <th className="px-6 py-3">Cargo</th>
                  <th className="px-6 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {colaboradoresActivos.map(c => {
                  const isSelected = selectedIds.includes(c.id);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => !isGenerating && handleToggleSelect(c.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-6 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(c.id)}
                          disabled={isGenerating}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-3.5 font-bold text-emerald-700">
                        {c.consecutivo}
                      </td>
                      <td className="px-6 py-3.5 font-medium text-slate-900">
                        {c.nombre}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 font-mono text-xs">
                        {c.cedula}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 text-xs">
                        {c.cargo}
                      </td>
                      <td className="px-6 py-3.5 font-bold text-slate-800 text-right">
                        {formatCurrencyCOP(c.valor)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Advertencia por Duplicados */}
      <Modal
        isOpen={showDuplicadosModal}
        onClose={() => setShowDuplicadosModal(false)}
        title="Advertencia: Cuentas Previamente Generadas"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <ShieldAlert size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Se encontraron cuentas existentes para este periodo y consecutivo.</p>
              <p className="mt-0.5 text-amber-700">
                El sistema detectó que ya existen cuentas de cobro generadas previamente para los siguientes colaboradores:
              </p>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl p-2 text-xs">
            {duplicadosDetectados.map((item, idx) => (
              <div key={idx} className="py-2 px-2 flex items-center justify-between">
                <div>
                  <strong className="text-slate-800">{item.colaborador.nombre}</strong>
                  <span className="text-slate-500 ml-2">N° {item.colaborador.consecutivo}</span>
                </div>
                <span className="text-slate-500 text-[11px]">
                  Generada: {formatDateDMY(item.match?.fecha)}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-600">
            ¿Deseas continuar y volver a generar estas cuentas de cobro? (No se sobrescribirá silenciosamente en Drive sin tu decisión).
          </p>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              onClick={() => setShowDuplicadosModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleIniciarGeneracion(true)}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm transition-all"
            >
              Continuar y Generar de Todas Formas
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

