import React, { useState } from 'react';
import {
  Settings,
  Save,
  Building2,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ConfiguracionFundacion } from '../types';
import { api } from '../services/api';

export const ConfiguracionView: React.FC = () => {
  const { config, saveConfig, isSyncing, addToast } = useApp();

  const [formData, setFormData] = useState<ConfiguracionFundacion>({ ...config });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleChange = (field: keyof ConfiguracionFundacion, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.NombreLegalFundacion.trim()) {
      addToast('error', 'El Nombre Legal de la Fundación es obligatorio.');
      return;
    }
    if (!formData.NIT.trim()) {
      addToast('error', 'El NIT de la Fundación es obligatorio.');
      return;
    }

    try {
      await saveConfig(formData);
    } catch (err: any) {
      addToast('error', 'Error al guardar la configuración: ' + err.message);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    // Guardar temporalmente la URL para probarla
    if (formData.GoogleWebAppUrl) {
      api.setWebAppUrl(formData.GoogleWebAppUrl);
    }

    try {
      const pingRes = await api.ping();
      if (pingRes.connected) {
        setTestResult({
          success: true,
          message: '¡Conexión exitosa con Google Apps Script y Google Sheets!'
        });
        addToast('success', 'Conexión con Google verificada con éxito.');
      } else {
        setTestResult({
          success: false,
          message: pingRes.message || 'No se pudo establecer conexión con Google Apps Script.'
        });
        addToast('warning', pingRes.message);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Error al conectar: ' + err.message
      });
      addToast('error', 'Error de conexión: ' + err.message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
            <Settings size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              Configuración Institucional y Conexiones
            </h2>
            <p className="text-xs text-slate-500">
              Parametriza los datos legales de la entidad y la sincronización gratuita con Google Cloud.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Bloque 1: Conexión con Google Apps Script (Backend) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Cloud size={18} className="text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-sm">
                Conexión Cloud ($0) — Google Apps Script & Drive
              </h3>
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Backend Serverless
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  URL de la Web App de Google Apps Script (Webhook)
                </label>
                <span className="text-[11px] text-slate-400">
                  Termina en <code>/exec</code>
                </span>
              </div>
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={formData.GoogleWebAppUrl || ''}
                onChange={(e) => handleChange('GoogleWebAppUrl', e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Si aún no has desplegado el script, la aplicación operará en <strong>Modo Local Offline</strong> de forma totalmente funcional.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Carpeta Raíz en Google Drive
                </label>
                <input
                  type="text"
                  placeholder="CUENTAS DE COBRO"
                  value={formData.CarpetaDrivePrincipal || ''}
                  onChange={(e) => handleChange('CarpetaDrivePrincipal', e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Nombre o ID de la carpeta donde se crearán las subcarpetas de Año y Mes.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ID de Google Sheets (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="ID de la hoja de cálculo de Google"
                  value={formData.GoogleSpreadsheetId || ''}
                  onChange={(e) => handleChange('GoogleSpreadsheetId', e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Identificador de la hoja para referencia interna.
                </span>
              </div>
            </div>

            {/* Prueba de Conexión */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !formData.GoogleWebAppUrl}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-40"
              >
                {isTesting ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
                <span>Probar Conexión con Apps Script</span>
              </button>

              {testResult && (
                <div
                  className={`text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {testResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bloque 2: Información Institucional y Legal de la Fundación */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 size={18} className="text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              Datos Institucionales y Legales (Aparecen en el PDF)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre Legal de la Fundación *
              </label>
              <input
                type="text"
                placeholder="Ej. FUNDACION HOGAR GERIATRICO MIS AÑOS DORADOS"
                value={formData.NombreLegalFundacion}
                onChange={(e) => handleChange('NombreLegalFundacion', e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIT de la Entidad *
              </label>
              <input
                type="text"
                placeholder="Ej. 901481005"
                value={formData.NIT}
                onChange={(e) => handleChange('NIT', e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dirección de la Sede
              </label>
              <input
                type="text"
                placeholder="Ej. Calle 12 # 34 - 56"
                value={formData.Direccion || ''}
                onChange={(e) => handleChange('Direccion', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ciudad y Departamento
              </label>
              <input
                type="text"
                placeholder="Ej. Barranquilla, Atlántico"
                value={formData.Ciudad || ''}
                onChange={(e) => handleChange('Ciudad', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teléfono de Contacto
              </label>
              <input
                type="text"
                placeholder="Ej. 300 123 4567"
                value={formData.Telefono || ''}
                onChange={(e) => handleChange('Telefono', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo Electrónico Oficial
              </label>
              <input
                type="email"
                placeholder="contacto@fundacion.org"
                value={formData.Correo || ''}
                onChange={(e) => handleChange('Correo', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Representante Legal
              </label>
              <input
                type="text"
                placeholder="Nombre del Representante Legal"
                value={formData.RepresentanteLegal || ''}
                onChange={(e) => handleChange('RepresentanteLegal', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cédula del Representante Legal
              </label>
              <input
                type="text"
                placeholder="Cédula de Ciudadanía"
                value={formData.CedulaRepresentante || ''}
                onChange={(e) => handleChange('CedulaRepresentante', e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Información Bancaria Institucional
            </label>
            <input
              type="text"
              placeholder="Ej. Bancolombia Cuenta de Ahorros N° 123-456789-00"
              value={formData.InformacionBancaria || ''}
              onChange={(e) => handleChange('InformacionBancaria', e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Otros Datos Institucionales u Observaciones
            </label>
            <textarea
              rows={2}
              placeholder="Observaciones o notas legales complementarias..."
              value={formData.OtrosDatosInstitucionales || ''}
              onChange={(e) => handleChange('OtrosDatosInstitucionales', e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Botón de Guardar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSyncing}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-900/30 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save size={16} />
            <span>Guardar Configuración</span>
          </button>
        </div>
      </form>
    </div>
  );
};
