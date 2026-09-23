import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  UserPlus,
  Edit2,
  UserX,
  Calendar,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Save,
  FileText,
  PenTool,
  Upload,
  Check,
  Trash2,
  ExternalLink,
  Loader2,
  UploadCloud
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Colaborador, EstadoColaborador } from '../types';
import { formatCurrencyCOP, parseCurrencyCOP } from '../utils/currency';
import { validateDateRange } from '../utils/dates';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { CargaMasivaModal } from '../components/CargaMasivaModal';

export const ColaboradoresView: React.FC = () => {
  const {
    colaboradores,
    periodo,
    setPeriodo,
    saveColaborador,
    deactivateColaborador,
    refreshColaboradores,
    isSyncing,
    setActiveTab,
    addToast
  } = useApp();

  // Estados de Búsqueda y Filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<'Todos' | 'Activo' | 'Inactivo'>('Todos');
  const [sortField, setSortField] = useState<'consecutivo' | 'nombre' | 'valor'>('consecutivo');

  // Modal de Carga Masiva
  const [isCargaMasivaOpen, setIsCargaMasivaOpen] = useState(false);

  // Estados de Modal Formulario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formConsecutivo, setFormConsecutivo] = useState('');
  const [formCedula, setFormCedula] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formCargo, setFormCargo] = useState('');
  const [formValorRaw, setFormValorRaw] = useState('');
  const [formEstado, setFormEstado] = useState<EstadoColaborador>('Activo');

  // Estados de Documentos y Firma
  const [formRutUrl, setFormRutUrl] = useState('');
  const [formCcUrl, setFormCcUrl] = useState('');
  const [formDiplomaUrl, setFormDiplomaUrl] = useState('');
  const [formFirmaUrl, setFormFirmaUrl] = useState('');
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Modo de Firma: 'draw' | 'upload'
  const [firmaMode, setFirmaMode] = useState<'draw' | 'upload'>('draw');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  const [formError, setFormError] = useState<string | null>(null);

  // Estado Modal de Desactivación
  const [deactivatingColab, setDeactivatingColab] = useState<Colaborador | null>(null);

  // Abrir modal para crear
  const handleOpenCreate = () => {
    setEditingId(null);
    const maxNum = colaboradores.reduce((acc, c) => {
      const parsed = parseInt(c.consecutivo.replace(/\D/g, ''), 10);
      return !isNaN(parsed) && parsed > acc ? parsed : acc;
    }, 0);
    const nextSug = String(maxNum + 1).padStart(3, '0');

    setFormConsecutivo(nextSug);
    setFormCedula('');
    setFormNombre('');
    setFormCargo('');
    setFormValorRaw('');
    setFormEstado('Activo');
    setFormRutUrl('');
    setFormCcUrl('');
    setFormDiplomaUrl('');
    setFormFirmaUrl('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Abrir modal para editar
  const handleOpenEdit = (c: Colaborador) => {
    setEditingId(c.id);
    setFormConsecutivo(c.consecutivo);
    setFormCedula(c.cedula);
    setFormNombre(c.nombre);
    setFormCargo(c.cargo);
    setFormValorRaw(String(c.valor));
    setFormEstado(c.estado);
    setFormRutUrl(c.rutUrl || '');
    setFormCcUrl(c.ccUrl || '');
    setFormDiplomaUrl(c.diplomaUrl || '');
    setFormFirmaUrl(c.firmaUrl || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Subir archivo de documento (RUT, CC, Diploma)
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: 'RUT' | 'CC' | 'Diploma'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(fileType);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Content = (reader.result as string).split(',')[1];
        try {
          const res = await api.uploadDocumento({
            base64Content,
            fileName: `${fileType}_${formConsecutivo || '001'}_${file.name}`,
            fileType,
            colaboradorNombre: formNombre || 'Colaborador',
          });
          const url = res.driveUrl || res.downloadUrl;
          if (fileType === 'RUT') setFormRutUrl(url);
          if (fileType === 'CC') setFormCcUrl(url);
          if (fileType === 'Diploma') setFormDiplomaUrl(url);
          addToast('success', `${fileType} cargado correctamente.`);
        } catch (uploadErr: any) {
          addToast('error', `Error al subir ${fileType}: ${uploadErr.message}`);
        } finally {
          setUploadingField(null);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadingField(null);
      addToast('error', 'Error al procesar archivo: ' + err.message);
    }
  };

  // Subir imagen de firma
  const handleFirmaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setFormFirmaUrl(dataUrl);
      addToast('success', 'Firma cargada correctamente.');
    };
    reader.readAsDataURL(file);
  };

  // Dibujo en Canvas de Firma
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawing.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // Color de tinta oscura

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      setFormFirmaUrl(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setFormFirmaUrl('');
  };

  // Guardar colaborador
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cNorm = formConsecutivo.trim();
    const cedNorm = formCedula.trim();
    const nNorm = formNombre.trim();
    const carNorm = formCargo.trim();
    const vParsed = parseCurrencyCOP(formValorRaw);

    if (!cNorm) {
      setFormError('El consecutivo es obligatorio.');
      return;
    }
    if (!cedNorm) {
      setFormError('La cédula o NIT es obligatoria.');
      return;
    }
    if (!nNorm) {
      setFormError('El nombre completo es obligatorio.');
      return;
    }
    if (!carNorm) {
      setFormError('El cargo o concepto es obligatorio.');
      return;
    }
    if (vParsed === null || vParsed <= 0) {
      setFormError('El valor a pagar debe ser un monto numérico mayor a cero.');
      return;
    }

    try {
      await saveColaborador({
        id: editingId || undefined,
        consecutivo: cNorm,
        cedula: cedNorm,
        nombre: nNorm,
        cargo: carNorm,
        valor: vParsed,
        estado: formEstado,
        rutUrl: formRutUrl,
        ccUrl: formCcUrl,
        diplomaUrl: formDiplomaUrl,
        firmaUrl: formFirmaUrl,
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar');
    }
  };

  // Confirmar desactivación
  const handleConfirmDeactivate = async () => {
    if (!deactivatingColab) return;
    try {
      await deactivateColaborador(deactivatingColab.id);
      setDeactivatingColab(null);
    } catch (err: any) {
      addToast('error', err.message);
    }
  };

  // Abrir enlace externo
  const handleOpenLink = (url?: string) => {
    if (!url) return;
    if ((window as any).electronAPI && typeof (window as any).electronAPI.openExternal === 'function') {
      (window as any).electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Filtrado y búsqueda
  const filteredColaboradores = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return colaboradores
      .filter(c => {
        if (filterEstado !== 'Todos' && c.estado !== filterEstado) return false;
        if (!q) return true;
        return (
          c.nombre.toLowerCase().includes(q) ||
          c.cedula.toLowerCase().includes(q) ||
          c.cargo.toLowerCase().includes(q) ||
          c.consecutivo.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortField === 'nombre') return a.nombre.localeCompare(b.nombre);
        if (sortField === 'valor') return b.valor - a.valor;
        return a.consecutivo.localeCompare(b.consecutivo, undefined, { numeric: true });
      });
  }, [colaboradores, searchTerm, filterEstado, sortField]);

  // Validar periodo e ir a generación
  const handleGoToGeneration = () => {
    const check = validateDateRange(periodo.fechaInicio, periodo.fechaFin);
    if (!check.valid) {
      addToast('warning', check.error || 'Verifica el periodo seleccionado.');
      return;
    }
    setActiveTab('generar');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Selector Rápido de Periodo de Facturación */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Periodo de Facturación</h3>
            <p className="text-xs text-slate-500">Estas fechas aplicarán a todas las cuentas generadas hoy.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">Inicio:</label>
            <input
              type="date"
              value={periodo.fechaInicio}
              onChange={(e) => setPeriodo(prev => ({ ...prev, fechaInicio: e.target.value }))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">Fin:</label>
            <input
              type="date"
              value={periodo.fechaFin}
              onChange={(e) => setPeriodo(prev => ({ ...prev, fechaFin: e.target.value }))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleGoToGeneration}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all ml-auto md:ml-2"
          >
            <span>Ir a Generación</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Barra de Herramientas y Búsqueda */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, cédula o cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center rounded-xl bg-slate-100 p-1 text-xs font-medium">
            {(['Todos', 'Activo', 'Inactivo'] as const).map(est => (
              <button
                key={est}
                onClick={() => setFilterEstado(est)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filterEstado === est
                    ? 'bg-white text-slate-800 shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {est}
              </button>
            ))}
          </div>

          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none bg-white"
          >
            <option value="consecutivo">Ordenar: Consecutivo</option>
            <option value="nombre">Ordenar: Nombre</option>
            <option value="valor">Ordenar: Mayor Valor</option>
          </select>

          <button
            onClick={() => refreshColaboradores()}
            disabled={isSyncing}
            title="Recargar datos"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin text-emerald-600' : ''} />
          </button>

          <button
            onClick={() => setIsCargaMasivaOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            title="Cargar y asociar automáticamente múltiples archivos de soporte"
          >
            <UploadCloud size={16} className="text-emerald-400" />
            <span>Carga Masiva</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <UserPlus size={16} />
            <span>Nuevo Colaborador</span>
          </button>
        </div>
      </div>

      {/* Tabla de Colaboradores */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-base">
            Empleados Registrados ({filteredColaboradores.length})
          </h3>
        </div>

        {filteredColaboradores.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <AlertCircle size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">No se encontraron colaboradores.</p>
            <p className="text-xs text-slate-400 mt-1">Prueba cambiando los filtros o agrega un nuevo colaborador.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Consecutivo</th>
                  <th className="px-4 py-3">Cédula</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3 text-center">Documentos & Firma</th>
                  <th className="px-4 py-3 text-right">Valor a Pagar</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredColaboradores.map(c => {
                  const isActivo = c.estado === 'Activo';
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isActivo
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {c.estado}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-bold text-emerald-800">
                        {c.consecutivo}
                      </td>

                      <td className="px-4 py-3.5 text-slate-700 font-mono text-xs">
                        {c.cedula}
                      </td>

                      <td className="px-4 py-3.5 font-medium text-slate-900">
                        {c.nombre}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 text-xs">
                        {c.cargo}
                      </td>

                      {/* Indicadores de Documentos Adjuntos y Firma */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold">
                          {c.ccUrl ? (
                            <button
                              onClick={() => handleOpenLink(c.ccUrl)}
                              title="Ver Cédula"
                              className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
                            >
                              CC
                            </button>
                          ) : (
                            <span title="Cédula pendiente" className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">
                              CC
                            </span>
                          )}

                          {c.rutUrl ? (
                            <button
                              onClick={() => handleOpenLink(c.rutUrl)}
                              title="Ver RUT"
                              className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                            >
                              RUT
                            </button>
                          ) : (
                            <span title="RUT pendiente" className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">
                              RUT
                            </span>
                          )}

                          {c.diplomaUrl ? (
                            <button
                              onClick={() => handleOpenLink(c.diplomaUrl)}
                              title="Ver Diploma"
                              className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors"
                            >
                              DIP
                            </button>
                          ) : (
                            <span title="Diploma pendiente" className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">
                              DIP
                            </span>
                          )}

                          {c.firmaUrl ? (
                            <span
                              title="Firma digitalizada registrada"
                              className="px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 inline-flex items-center gap-0.5"
                            >
                              <PenTool size={10} />
                              <span>Firma</span>
                            </span>
                          ) : (
                            <span title="Sin firma digital" className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">
                              Firma
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-bold text-slate-800 text-right">
                        {formatCurrencyCOP(c.valor)}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            title="Editar colaborador"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          {isActivo && (
                            <button
                              onClick={() => setDeactivatingColab(c)}
                              title="Desactivar colaborador"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <UserX size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Agregar / Editar Colaborador con Adjuntos y Firma */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Colaborador' : 'Nuevo Colaborador'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSave} className="space-y-5">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Bloque 1: Datos Básicos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Consecutivo *
              </label>
              <input
                type="text"
                placeholder="Ej. 001"
                value={formConsecutivo}
                onChange={(e) => setFormConsecutivo(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Cédula / NIT *
              </label>
              <input
                type="text"
                placeholder="Ej. 104567890"
                value={formCedula}
                onChange={(e) => setFormCedula(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                placeholder="Ej. Juan Pérez"
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Cargo / Concepto de Pago *
              </label>
              <input
                type="text"
                placeholder="Ej. Auxiliar de enfermería"
                value={formCargo}
                onChange={(e) => setFormCargo(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Valor a Pagar (COP) *
              </label>
              <input
                type="text"
                placeholder="Ej. 1500000 o 1.500.000"
                value={formValorRaw}
                onChange={(e) => setFormValorRaw(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
                required
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Previsualización: <strong className="text-emerald-700">{formatCurrencyCOP(formValorRaw)}</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Estado *
              </label>
              <select
                value={formEstado}
                onChange={(e) => setFormEstado(e.target.value as EstadoColaborador)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none bg-white"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          {/* Bloque 2: Adjuntar Documentos (RUT, CC, Diploma) */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Documentos de Soporte (Google Drive)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Cédula */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Cédula (CC)</span>
                  {formCcUrl ? (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Check size={10} /> Cargado
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Pendiente</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1 shadow-sm">
                    {uploadingField === 'CC' ? (
                      <Loader2 size={12} className="animate-spin text-emerald-600" />
                    ) : (
                      <Upload size={12} />
                    )}
                    <span>{formCcUrl ? 'Reemplazar' : 'Subir CC'}</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'CC')}
                      disabled={uploadingField !== null}
                    />
                  </label>
                  {formCcUrl && (
                    <button
                      type="button"
                      onClick={() => handleOpenLink(formCcUrl)}
                      className="text-slate-500 hover:text-emerald-600 p-1"
                      title="Ver archivo"
                    >
                      <ExternalLink size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* RUT */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">RUT</span>
                  {formRutUrl ? (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Check size={10} /> Cargado
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Pendiente</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1 shadow-sm">
                    {uploadingField === 'RUT' ? (
                      <Loader2 size={12} className="animate-spin text-blue-600" />
                    ) : (
                      <Upload size={12} />
                    )}
                    <span>{formRutUrl ? 'Reemplazar' : 'Subir RUT'}</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'RUT')}
                      disabled={uploadingField !== null}
                    />
                  </label>
                  {formRutUrl && (
                    <button
                      type="button"
                      onClick={() => handleOpenLink(formRutUrl)}
                      className="text-slate-500 hover:text-blue-600 p-1"
                      title="Ver archivo"
                    >
                      <ExternalLink size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Diploma */}
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Diploma</span>
                  {formDiplomaUrl ? (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Check size={10} /> Cargado
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Pendiente</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1 shadow-sm">
                    {uploadingField === 'Diploma' ? (
                      <Loader2 size={12} className="animate-spin text-purple-600" />
                    ) : (
                      <Upload size={12} />
                    )}
                    <span>{formDiplomaUrl ? 'Reemplazar' : 'Subir Diploma'}</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'Diploma')}
                      disabled={uploadingField !== null}
                    />
                  </label>
                  {formDiplomaUrl && (
                    <button
                      type="button"
                      onClick={() => handleOpenLink(formDiplomaUrl)}
                      className="text-slate-500 hover:text-purple-600 p-1"
                      title="Ver archivo"
                    >
                      <ExternalLink size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bloque 3: Firma Digitalizada para el PDF */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenTool size={16} className="text-teal-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Firma Digital para la Cuenta de Cobro
                </h4>
              </div>

              <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setFirmaMode('draw')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    firmaMode === 'draw' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Dibujar Firma
                </button>
                <button
                  type="button"
                  onClick={() => setFirmaMode('upload')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    firmaMode === 'upload' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Subir Foto/PNG
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-4">
              {firmaMode === 'draw' ? (
                <div className="space-y-2">
                  <div className="border border-slate-300 rounded-xl bg-white shadow-inner overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width={320}
                      height={110}
                      className="cursor-crosshair block touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Dibuja la firma con el mouse o touchpad</span>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      <span>Limpiar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="cursor-pointer px-4 py-3 rounded-xl bg-white border border-dashed border-slate-300 hover:border-teal-500 text-slate-600 flex flex-col items-center justify-center gap-1 transition-colors">
                    <Upload size={18} className="text-teal-600" />
                    <span className="text-xs font-semibold">Seleccionar foto o PNG de la firma</span>
                    <span className="text-[10px] text-slate-400">PNG o JPG con fondo claro</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={handleFirmaUpload}
                    />
                  </label>
                </div>
              )}

              {/* Previsualización de Firma */}
              <div className="flex-1 w-full sm:w-auto p-3 rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center min-h-[110px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Estampa en el PDF
                </span>
                {formFirmaUrl ? (
                  <img
                    src={formFirmaUrl}
                    alt="Firma"
                    className="max-h-16 max-w-full object-contain filter drop-shadow-sm"
                  />
                ) : (
                  <span className="text-xs text-slate-300 italic">Sin firma registrada</span>
                )}
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSyncing || uploadingField !== null}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              <Save size={15} />
              <span>{editingId ? 'Guardar Cambios' : 'Registrar Colaborador'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmación de Desactivación */}
      <Modal
        isOpen={!!deactivatingColab}
        onClose={() => setDeactivatingColab(null)}
        title="Confirmar Desactivación"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            ¿Estás seguro de que deseas desactivar a <strong className="text-slate-800">{deactivatingColab?.nombre}</strong>?
          </p>
          <p className="text-xs text-slate-500 bg-amber-50 p-3 rounded-xl border border-amber-200">
            Los colaboradores inactivos no se seleccionarán automáticamente para la generación de cuentas de cobro.
          </p>
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeactivatingColab(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmDeactivate}
              disabled={isSyncing}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50"
            >
              Desactivar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Carga Masiva de Documentos */}
      <CargaMasivaModal
        isOpen={isCargaMasivaOpen}
        onClose={() => setIsCargaMasivaOpen(false)}
        colaboradores={colaboradores}
        onSuccess={refreshColaboradores}
        addToast={addToast}
      />
    </div>
  );
};
