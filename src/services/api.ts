import { Colaborador, ConfiguracionFundacion, HistorialCuenta } from '../types';

const STORAGE_KEYS = {
  COLABORADORES: 'app_colaboradores_local',
  CONFIGURACION: 'app_configuracion_local',
  HISTORIAL: 'app_historial_local',
  WEB_APP_URL: 'app_google_webapp_url',
};

// Configuración inicial institucional por defecto (basada en la plantilla de la fundación)
export const DEFAULT_CONFIG: ConfiguracionFundacion = {
  NombreLegalFundacion: 'FUNDACION HOGAR GERIATRICO MIS AÑOS DORADOS',
  NIT: '901481005',
  Direccion: 'Calle Principal # 12 - 34',
  Ciudad: 'Barranquilla, Atlántico',
  Telefono: '300 123 4567',
  Correo: 'contacto@fundacionmisaniosdorados.org',
  RepresentanteLegal: 'Representante Institucional',
  CedulaRepresentante: '12345678',
  InformacionBancaria: 'Bancolombia Cuenta de Ahorros N° 123-456789-00',
  CarpetaDrivePrincipal: 'CUENTAS DE COBRO',
  OtrosDatosInstitucionales: 'Vigilado y registrado ante las autoridades competentes.',
  GoogleWebAppUrl: 'https://script.google.com/macros/s/AKfycbwbvVyOUbq9eZJ_NMnx0nuyBaCtns10_uHdrTm9GlKe6zO91wwJbih9yF9Zi-KNK7N-FA/exec',
};

// Datos semilla de prueba recomendados
export const MOCK_COLABORADORES_INICIALES: Colaborador[] = [
  {
    id: 'mock-1',
    nombre: 'Juan Pérez',
    cedula: '1234567890',
    cargo: 'Auxiliar Administrativo',
    consecutivo: '001',
    valor: 1500000,
    estado: 'Activo',
    fechaCreacion: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    nombre: 'Arledys Zúñiga López',
    cedula: '1044925861',
    cargo: 'Auxiliar de Enfermería',
    consecutivo: '002',
    valor: 1600000,
    estado: 'Activo',
    fechaCreacion: new Date().toISOString(),
  },
  {
    id: 'mock-3',
    nombre: 'Alejandra María Mestre Martínez',
    cedula: '45556260',
    cargo: 'Coordinadora de Cuidados',
    consecutivo: '003',
    valor: 1800000,
    estado: 'Activo',
    fechaCreacion: new Date().toISOString(),
  },
  {
    id: 'mock-4',
    nombre: 'Carlos Rodríguez',
    cedula: '1128061174',
    cargo: 'Servicios Generales',
    consecutivo: '004',
    valor: 1300000,
    estado: 'Inactivo',
    fechaCreacion: new Date().toISOString(),
  }
];

class ApiService {
  private getWebAppUrl(): string {
    const fromStorage = localStorage.getItem(STORAGE_KEYS.WEB_APP_URL);
    if (fromStorage && fromStorage.trim()) {
      return fromStorage.trim();
    }
    const config = this.getLocalConfig();
    return config.GoogleWebAppUrl?.trim() || '';
  }

  public setWebAppUrl(url: string): void {
    localStorage.setItem(STORAGE_KEYS.WEB_APP_URL, url.trim());
  }

  // --- Almacenamiento Local de Respaldo / Modo Offline ---
  private getLocalColaboradores(): Colaborador[] {
    const raw = localStorage.getItem(STORAGE_KEYS.COLABORADORES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.COLABORADORES, JSON.stringify(MOCK_COLABORADORES_INICIALES));
      return MOCK_COLABORADORES_INICIALES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return MOCK_COLABORADORES_INICIALES;
    }
  }

  private saveLocalColaboradores(list: Colaborador[]): void {
    localStorage.setItem(STORAGE_KEYS.COLABORADORES, JSON.stringify(list));
  }

  private getLocalConfig(): ConfiguracionFundacion {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIGURACION);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CONFIGURACION, JSON.stringify(DEFAULT_CONFIG));
      return DEFAULT_CONFIG;
    }
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_CONFIG;
    }
  }

  private saveLocalConfig(config: ConfiguracionFundacion): void {
    localStorage.setItem(STORAGE_KEYS.CONFIGURACION, JSON.stringify(config));
  }

  private getLocalHistorial(): HistorialCuenta[] {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORIAL);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveLocalHistorial(historial: HistorialCuenta[]): void {
    localStorage.setItem(STORAGE_KEYS.HISTORIAL, JSON.stringify(historial));
  }

  // --- Peticiones HTTP a Google Apps Script ---
  private async requestGAS(action: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<any> {
    const url = this.getWebAppUrl();

    if (!url) {
      // Modo local/offline explícito
      return null;
    }

    if (!navigator.onLine) {
      throw new Error('No hay conexión a Internet. Comprueba tu conexión de red.');
    }

    try {
      let response: Response;
      if (method === 'GET') {
        const queryParams = new URLSearchParams({ action, ...(data || {}) });
        response = await fetch(`${url}?${queryParams.toString()}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
      } else {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // GAS requiere text/plain para evitar bloqueos CORS en redirect
          body: JSON.stringify({ action, data }),
        });
      }

      if (!response.ok) {
        throw new Error(`Error en el servidor de Google (${response.status}): ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Error desconocido reportado por Google Apps Script');
      }

      return result.data;
    } catch (err: any) {
      console.warn(`Petición GAS (${action}) falló:`, err.message);
      throw err;
    }
  }

  // --- MÉTODOS PÚBLICOS DE LA API ---

  public async ping(): Promise<{ connected: boolean; message: string }> {
    const url = this.getWebAppUrl();
    if (!url) {
      return { connected: false, message: 'Google Apps Script no configurado (modo local)' };
    }
    if (!navigator.onLine) {
      return { connected: false, message: 'Sin conexión a Internet' };
    }
    try {
      const data = await this.requestGAS('ping', 'GET');
      return { connected: true, message: data?.message || 'Conectado a Google Apps Script' };
    } catch (err: any) {
      return { connected: false, message: err.message };
    }
  }

  public async getColaboradores(): Promise<Colaborador[]> {
    const url = this.getWebAppUrl();
    if (url && navigator.onLine) {
      try {
        const remoteList = await this.requestGAS('getColaboradores', 'GET');
        if (Array.isArray(remoteList)) {
          this.saveLocalColaboradores(remoteList);
          return remoteList;
        }
      } catch (err) {
        console.warn('Fallback a colaboradores locales por error en red:', err);
      }
    }
    return this.getLocalColaboradores();
  }

  public async saveColaborador(colaborador: Partial<Colaborador>): Promise<Colaborador> {
    const url = this.getWebAppUrl();
    let saved: Colaborador;

    if (url && navigator.onLine) {
      // Guardar en Google Sheets
      saved = await this.requestGAS('saveColaborador', 'POST', colaborador);
      // Sincronizar copia local
      const localList = this.getLocalColaboradores();
      const idx = localList.findIndex(c => c.id === saved.id);
      if (idx >= 0) {
        localList[idx] = saved;
      } else {
        localList.push(saved);
      }
      this.saveLocalColaboradores(localList);
      return saved;
    } else {
      // Guardar localmente
      const localList = this.getLocalColaboradores();
      const now = new Date().toISOString();

      if (colaborador.id) {
        const idx = localList.findIndex(c => c.id === colaborador.id);
        if (idx >= 0) {
          saved = {
            ...localList[idx],
            ...colaborador,
            fechaActualizacion: now,
          } as Colaborador;
          localList[idx] = saved;
        } else {
          saved = { ...colaborador, id: colaborador.id, fechaActualizacion: now } as Colaborador;
          localList.push(saved);
        }
      } else {
        saved = {
          id: `local-${Date.now()}`,
          nombre: colaborador.nombre || '',
          cedula: colaborador.cedula || '',
          cargo: colaborador.cargo || '',
          consecutivo: colaborador.consecutivo || '',
          valor: Number(colaborador.valor) || 0,
          estado: colaborador.estado || 'Activo',
          rutUrl: colaborador.rutUrl || '',
          ccUrl: colaborador.ccUrl || '',
          diplomaUrl: colaborador.diplomaUrl || '',
          firmaUrl: colaborador.firmaUrl || '',
          fechaCreacion: now,
          fechaActualizacion: now,
        };
        localList.push(saved);
      }
      this.saveLocalColaboradores(localList);
      return saved;
    }
  }

  public async deactivateColaborador(id: string): Promise<boolean> {
    const url = this.getWebAppUrl();
    if (url && navigator.onLine) {
      await this.requestGAS('deactivateColaborador', 'POST', { id });
    }

    // Actualizar localmente
    const localList = this.getLocalColaboradores();
    const target = localList.find(c => c.id === id);
    if (target) {
      target.estado = 'Inactivo';
      target.fechaActualizacion = new Date().toISOString();
      this.saveLocalColaboradores(localList);
      return true;
    }
    return false;
  }

  public async getConfiguracion(): Promise<ConfiguracionFundacion> {
    const url = this.getWebAppUrl();
    if (url && navigator.onLine) {
      try {
        const remoteConfig = await this.requestGAS('getConfiguracion', 'GET');
        if (remoteConfig && typeof remoteConfig === 'object') {
          const merged = { ...this.getLocalConfig(), ...remoteConfig };
          this.saveLocalConfig(merged);
          return merged;
        }
      } catch (err) {
        console.warn('Fallback a configuración local:', err);
      }
    }
    return this.getLocalConfig();
  }

  public async saveConfiguracion(config: ConfiguracionFundacion): Promise<ConfiguracionFundacion> {
    if (config.GoogleWebAppUrl) {
      this.setWebAppUrl(config.GoogleWebAppUrl);
    }
    this.saveLocalConfig(config);

    const url = config.GoogleWebAppUrl || this.getWebAppUrl();
    if (url && navigator.onLine) {
      try {
        await this.requestGAS('saveConfiguracion', 'POST', config);
      } catch (err) {
        console.warn('No fue posible guardar remotamente la configuración:', err);
      }
    }

    return config;
  }

  public async getHistorial(): Promise<HistorialCuenta[]> {
    const url = this.getWebAppUrl();
    if (url && navigator.onLine) {
      try {
        const remoteHistorial = await this.requestGAS('getHistorial', 'GET');
        if (Array.isArray(remoteHistorial)) {
          this.saveLocalHistorial(remoteHistorial);
          return remoteHistorial;
        }
      } catch (err) {
        console.warn('Fallback a historial local:', err);
      }
    }
    return this.getLocalHistorial();
  }

  public async recordHistorial(entry: Partial<HistorialCuenta>): Promise<HistorialCuenta> {
    const url = this.getWebAppUrl();
    const fullEntry: HistorialCuenta = {
      id: entry.id || `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fechaGeneracion: entry.fechaGeneracion || new Date().toISOString(),
      colaborador: entry.colaborador || '',
      cedula: entry.cedula || '',
      periodoInicio: entry.periodoInicio || '',
      periodoFin: entry.periodoFin || '',
      consecutivo: entry.consecutivo || '',
      valor: Number(entry.valor) || 0,
      nombreArchivo: entry.nombreArchivo || '',
      driveFileId: entry.driveFileId || '',
      driveUrl: entry.driveUrl || '',
      estado: entry.estado || 'Generado',
    };

    if (url && navigator.onLine) {
      try {
        await this.requestGAS('recordHistorial', 'POST', fullEntry);
      } catch (err) {
        console.warn('Error al guardar historial en Google Sheets:', err);
      }
    }

    const localHist = this.getLocalHistorial();
    localHist.unshift(fullEntry);
    this.saveLocalHistorial(localHist);

    return fullEntry;
  }

  public async checkDuplicate(
    colaborador: string,
    periodoInicio: string,
    periodoFin: string,
    consecutivo: string
  ): Promise<{ exists: boolean; match?: any }> {
    const url = this.getWebAppUrl();
    if (url && navigator.onLine) {
      try {
        const result = await this.requestGAS('checkDuplicate', 'GET', {
          colaborador,
          periodoInicio,
          periodoFin,
          consecutivo,
        });
        if (result && result.exists) return result;
      } catch {
        // Fallback a verificación local si falla la red
      }
    }

    // Verificación en historial local
    const localHistorial = this.getLocalHistorial();
    const cNorm = colaborador.trim().toLowerCase();
    const piNorm = periodoInicio.trim();
    const pfNorm = periodoFin.trim();
    const consNorm = consecutivo.trim().toLowerCase();

    const match = localHistorial.find(h =>
      h.colaborador.trim().toLowerCase() === cNorm &&
      h.periodoInicio.trim() === piNorm &&
      h.periodoFin.trim() === pfNorm &&
      h.consecutivo.trim().toLowerCase() === consNorm
    );

    if (match) {
      return { exists: true, match };
    }

    return { exists: false };
  }

  public async uploadDocumento(data: {
    base64Content: string;
    fileName: string;
    fileType: 'RUT' | 'CC' | 'Diploma' | 'Firma';
    colaboradorNombre: string;
    rootFolderId?: string;
  }): Promise<{ fileId: string; driveUrl: string; downloadUrl: string }> {
    const url = this.getWebAppUrl();
    if (url && navigator.onLine) {
      try {
        return await this.requestGAS('uploadDocumentoColaborador', 'POST', data);
      } catch (err) {
        console.warn('Fallo al subir documento a Drive, usando respaldo local:', err);
      }
    }
    // Modo local / offline
    const fakeId = `doc-${Date.now()}`;
    const dataUrl = data.base64Content.startsWith('data:')
      ? data.base64Content
      : `data:application/octet-stream;base64,${data.base64Content}`;
    return {
      fileId: fakeId,
      driveUrl: dataUrl,
      downloadUrl: dataUrl,
    };
  }

  public async vincularDocumentosMasivosDrive(): Promise<{ procesados: number; asociados: number; mensaje?: string }> {
    const url = this.getWebAppUrl();
    if (!url || !navigator.onLine) {
      throw new Error('Se requiere conexión a Internet y la URL de Google Apps Script configurada.');
    }
    return await this.requestGAS('vincularDocumentosMasivos', 'POST', {});
  }

  public async uploadPdfToDrive(data: {
    base64Content: string;
    fileName: string;
    year: string;
    monthName: string;
    monthNumber: string;
    rootFolderId?: string;
  }): Promise<{ fileId: string; driveUrl: string; downloadUrl: string; folderPath: string }> {
    const url = this.getWebAppUrl();
    if (!url) {
      throw new Error('No está configurada la URL de Google Apps Script para subir archivos a Google Drive.');
    }
    if (!navigator.onLine) {
      throw new Error('No hay conexión a Internet para subir el archivo a Google Drive.');
    }

    return await this.requestGAS('uploadPdf', 'POST', data);
  }
}

export const api = new ApiService();

