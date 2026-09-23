export type EstadoColaborador = 'Activo' | 'Inactivo';

export interface Colaborador {
  id: string;
  nombre: string;
  cedula: string;
  cargo: string;
  consecutivo: string;
  valor: number;
  estado: EstadoColaborador;
  rutUrl?: string;
  ccUrl?: string;
  diplomaUrl?: string;
  firmaUrl?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface ConfiguracionFundacion {
  NombreLegalFundacion: string;
  NIT: string;
  Direccion: string;
  Ciudad: string;
  Telefono: string;
  Correo: string;
  RepresentanteLegal: string;
  CedulaRepresentante: string;
  InformacionBancaria: string;
  CarpetaDrivePrincipal: string;
  OtrosDatosInstitucionales: string;
  GoogleWebAppUrl?: string; // URL del webhook de Google Apps Script
  GoogleSpreadsheetId?: string; // ID opcional para referencia
}

export interface HistorialCuenta {
  id: string;
  fechaGeneracion: string;
  colaborador: string;
  cedula: string;
  periodoInicio: string;
  periodoFin: string;
  consecutivo: string;
  valor: number;
  nombreArchivo: string;
  driveFileId: string;
  driveUrl: string;
  estado: 'Generado' | 'Error en Drive' | 'Error';
}

export interface PeriodoFacturacion {
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string;    // YYYY-MM-DD
}

export interface ItemResultadoGeneracion {
  colaboradorId: string;
  nombre: string;
  cedula: string;
  consecutivo: string;
  exito: boolean;
  error?: string;
  driveUrl?: string;
  nombreArchivo?: string;
  pdfBlob?: Blob;
}

export interface ResumenGeneracion {
  total: number;
  generadas: number;
  errores: number;
  items: ItemResultadoGeneracion[];
}

export type ViewTab = 'dashboard' | 'colaboradores' | 'generar' | 'historial' | 'configuracion';

export interface ToastMessage {
  id: string;
  tipo: 'success' | 'error' | 'warning' | 'info';
  mensaje: string;
}

