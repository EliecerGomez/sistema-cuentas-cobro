import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Loader2,
  X,
  FileCheck
} from 'lucide-react';
import { Colaborador } from '../types';
import { matchFileToColaborador, FileMatchResult, TipoDocumentoSoporte } from '../utils/fileMatcher';
import { api } from '../services/api';

interface CargaMasivaModalProps {
  isOpen: boolean;
  onClose: () => void;
  colaboradores: Colaborador[];
  onSuccess: () => Promise<void>;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

interface ItemProcesamiento extends FileMatchResult {
  id: string;
}

export const CargaMasivaModal: React.FC<CargaMasivaModalProps> = ({
  isOpen,
  onClose,
  colaboradores,
  onSuccess,
  addToast,
}) => {
  const [items, setItems] = useState<ItemProcesamiento[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [progresoTexto, setProgresoTexto] = useState<string>('');
  const [progresoPorcentaje, setProgresoPorcentaje] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilesAdded = (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;

    const newItems: ItemProcesamiento[] = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const match = matchFileToColaborador(file, colaboradores);
      newItems.push({
        ...match,
        id: `file-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      });
    }

    setItems(prev => [...prev, ...newItems]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const handleUpdateColaborador = (id: string, colabId: string) => {
    const colab = colaboradores.find(c => c.id === colabId);
    setItems(prev =>
      prev.map(it => {
        if (it.id !== id) return it;
        return {
          ...it,
          colaboradorId: colabId || undefined,
          colaboradorNombre: colab?.nombre,
          colaboradorCedula: colab?.cedula,
          confidence: colabId ? 'manual' : 'none',
        };
      })
    );
  };

  const handleUpdateTipo = (id: string, tipo: TipoDocumentoSoporte) => {
    setItems(prev =>
      prev.map(it => {
        if (it.id !== id) return it;
        return { ...it, tipo };
      })
    );
  };

  // Convertir archivo a Data URL Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Ejecutar subida y vinculación masiva
  const handleGuardarTodo = async () => {
    const validItems = items.filter(it => it.colaboradorId && it.tipo);
    if (validItems.length === 0) {
      addToast('warning', 'No hay archivos asociados a colaboradores para procesar.');
      return;
    }

    setIsUploading(true);
    setProgresoPorcentaje(0);
    setProgresoTexto('Iniciando vinculación masiva...');

    let exitos = 0;
    let fallos = 0;
    const total = validItems.length;

    // Mapa temporal para acumular cambios por colaborador
    const colaboradoresModificados: { [colabId: string]: Colaborador } = {};

    // Inicializar mapa con copia de colaboradores
    colaboradores.forEach(c => {
      colaboradoresModificados[c.id] = { ...c };
    });

    for (let i = 0; i < total; i++) {
      const item = validItems[i];
      setProgresoTexto(`Procesando (${i + 1} de ${total}): ${item.fileName}...`);
      setProgresoPorcentaje(Math.round(((i + 0.5) / total) * 100));

      try {
        const base64 = await fileToBase64(item.file);
        const colabTarget = colaboradoresModificados[item.colaboradorId!];

        // Subida a Drive o almacenamiento local
        const uploadRes = await api.uploadDocumento({
          base64Content: base64,
          fileName: item.fileName,
          fileType: item.tipo!,
          colaboradorNombre: colabTarget.nombre,
        });

        const finalUrl = uploadRes.driveUrl || uploadRes.downloadUrl;

        // Asignar al campo respectivo
        if (item.tipo === 'CC') {
          colabTarget.ccUrl = finalUrl;
        } else if (item.tipo === 'RUT') {
          colabTarget.rutUrl = finalUrl;
        } else if (item.tipo === 'Diploma') {
          colabTarget.diplomaUrl = finalUrl;
        } else if (item.tipo === 'Firma') {
          colabTarget.firmaUrl = finalUrl;
        }

        exitos++;
      } catch (err: any) {
        console.error(`Error al procesar archivo ${item.fileName}:`, err);
        fallos++;
      }

      setProgresoPorcentaje(Math.round(((i + 1) / total) * 100));
    }

    // Guardar los colaboradores que fueron modificados
    const colabsAfectados = Object.values(colaboradoresModificados).filter(c => {
      const orig = colaboradores.find(o => o.id === c.id);
      if (!orig) return false;
      return (
        orig.ccUrl !== c.ccUrl ||
        orig.rutUrl !== c.rutUrl ||
        orig.diplomaUrl !== c.diplomaUrl ||
        orig.firmaUrl !== c.firmaUrl
      );
    });

    setProgresoTexto('Guardando cambios en la base de datos...');
    for (const c of colabsAfectados) {
      try {
        await api.saveColaborador(c);
      } catch (e) {
        console.warn(`Error al guardar colaborador ${c.nombre}:`, e);
      }
    }

    await onSuccess();
    setIsUploading(false);

    addToast(
      fallos === 0 ? 'success' : 'warning',
      `Carga masiva finalizada: ${exitos} documentos vinculados con éxito.${
        fallos > 0 ? ` (${fallos} con error)` : ''
      }`
    );
    onClose();
  };

  const handleEscanearDrive = async () => {
    setIsUploading(true);
    setProgresoTexto('Escaneando carpeta "CARGA_MASIVA_DOCUMENTOS" en Google Drive...');
    setProgresoPorcentaje(40);

    try {
      const res = await api.vincularDocumentosMasivosDrive();
      setProgresoPorcentaje(100);
      await onSuccess();
      addToast(
        'success',
        `Google Drive: ${res.procesados} archivos analizados, ${res.asociados} vinculados a la hoja de cálculo.`
      );
      onClose();
    } catch (err: any) {
      addToast('error', err.message || 'No se pudo completar el escaneo de Drive.');
    } finally {
      setIsUploading(false);
    }
  };

  const countAsociados = items.filter(it => it.colaboradorId && it.tipo).length;
  const countSinAsociar = items.length - countAsociados;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
              <UploadCloud size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Carga Masiva de Documentos y Soportes
              </h2>
              <p className="text-xs text-slate-500">
                Arrastra los archivos de tus colaboradores; el sistema los asociará automáticamente por su cédula o nombre.
              </p>
            </div>
          </div>
          {!isUploading && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Zona de Dropzone y Tabla */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Opción alternativa: Escanear carpeta de Google Drive */}
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
            <div className="text-blue-900">
              <strong className="font-semibold block">¿Cargaste los archivos directamente en Google Drive?</strong>
              <span className="text-blue-700/90 text-[11px]">
                Si colocaste los PDFs en la carpeta <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-800">CARGA_MASIVA_DOCUMENTOS</code> de Google Drive, puedes vincularlos de inmediato:
              </span>
            </div>
            <button
              type="button"
              onClick={handleEscanearDrive}
              disabled={isUploading}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shrink-0 transition-colors cursor-pointer disabled:opacity-50"
            >
              Escanear Drive
            </button>
          </div>

          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 text-center space-y-2 group"
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".pdf,image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(e) => handleFilesAdded(e.target.files)}
              disabled={isUploading}
            />
            <div className="w-12 h-12 rounded-full bg-emerald-100/80 flex items-center justify-center text-emerald-700 group-hover:scale-110 transition-transform">
              <UploadCloud size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Haz clic para seleccionar o arrastra aquí tus archivos masivos
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Formatos soportados: PDF, PNG, JPG (RUT, Cédulas, Diplomas, Firmas)
              </p>
            </div>
          </div>

          {/* Estado de Progreso de Subida */}
          {isUploading && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-emerald-600" />
                  {progresoTexto}
                </span>
                <span>{progresoPorcentaje}%</span>
              </div>
              <div className="w-full bg-emerald-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progresoPorcentaje}%` }}
                />
              </div>
            </div>
          )}

          {/* Resumen de Detección */}
          {items.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-slate-700">
                  Archivos cargados: <strong className="text-slate-900">{items.length}</strong>
                </span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={14} /> {countAsociados} listos para vincular
                </span>
                {countSinAsociar > 0 && (
                  <span className="text-amber-600 font-medium flex items-center gap-1">
                    <AlertCircle size={14} /> {countSinAsociar} pendientes de asociar
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setItems([])}
                disabled={isUploading}
                className="text-rose-600 hover:text-rose-700 font-medium"
              >
                Limpiar lista
              </button>
            </div>
          )}

          {/* Tabla de Archivos */}
          {items.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      <th className="py-2.5 px-4">Archivo</th>
                      <th className="py-2.5 px-3">Colaborador Asignado</th>
                      <th className="py-2.5 px-3">Tipo Documento</th>
                      <th className="py-2.5 px-3">Detección</th>
                      <th className="py-2.5 px-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-medium text-slate-800 max-w-[220px] truncate" title={it.fileName}>
                          <div className="flex items-center gap-2">
                            <FileText size={15} className="text-slate-400 shrink-0" />
                            <span className="truncate">{it.fileName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={it.colaboradorId || ''}
                            onChange={(e) => handleUpdateColaborador(it.id, e.target.value)}
                            disabled={isUploading}
                            className={`w-full py-1 px-2 rounded-lg border text-xs ${
                              it.colaboradorId
                                ? 'border-slate-200 text-slate-800 bg-white'
                                : 'border-amber-300 text-amber-800 bg-amber-50'
                            } focus:outline-none focus:border-emerald-500`}
                          >
                            <option value="">-- Seleccionar colaborador --</option>
                            {colaboradores.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.nombre} (C.C. {c.cedula})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={it.tipo || 'CC'}
                            onChange={(e) => handleUpdateTipo(it.id, e.target.value as TipoDocumentoSoporte)}
                            disabled={isUploading}
                            className="py-1 px-2 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="CC">Cédula (CC)</option>
                            <option value="RUT">RUT</option>
                            <option value="Diploma">Diploma / Acta</option>
                            <option value="Firma">Firma Digital</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          {it.confidence === 'exact_cedula' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={11} /> Cédula
                            </span>
                          )}
                          {it.confidence === 'name_match' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                              <CheckCircle2 size={11} /> Nombre
                            </span>
                          )}
                          {it.confidence === 'manual' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                              Manual
                            </span>
                          )}
                          {it.confidence === 'none' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertCircle size={11} /> Pendiente
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(it.id)}
                            disabled={isUploading}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded hover:bg-slate-100"
                            title="Quitar de la lista"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleGuardarTodo}
            disabled={isUploading || countAsociados === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Procesando documentos...
              </>
            ) : (
              <>
                <FileCheck size={16} />
                Vincular y Guardar ({countAsociados} archivos)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
