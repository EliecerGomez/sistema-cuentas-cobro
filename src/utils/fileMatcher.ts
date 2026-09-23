import { Colaborador } from '../types';

export type TipoDocumentoSoporte = 'RUT' | 'CC' | 'Diploma' | 'Firma';

export interface FileMatchResult {
  file: File;
  fileName: string;
  fileSize: number;
  colaboradorId?: string;
  colaboradorNombre?: string;
  colaboradorCedula?: string;
  tipo?: TipoDocumentoSoporte;
  confidence: 'exact_cedula' | 'name_match' | 'manual' | 'none';
}

/**
 * Normaliza cadenas quitando tildes, signos y convirtiendo a minúsculas
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Detecta el tipo de documento a partir del nombre del archivo
 */
export function detectDocumentType(fileName: string): TipoDocumentoSoporte | undefined {
  const norm = normalizeText(fileName);

  // Detección de RUT
  if (/(?:^|[_\s.-])rut(?:[_\s.-]|$)/i.test(norm) || norm.includes('rut')) {
    return 'RUT';
  }

  // Detección de Cédula de Ciudadanía
  if (
    /(?:^|[_\s.-])(cc|cedula|identificacion|dni|ti)(?:[_\s.-]|$)/i.test(norm) ||
    norm.includes('cedula') ||
    norm.includes('identificacion')
  ) {
    return 'CC';
  }

  // Detección de Diploma / Acta
  if (
    /(?:^|[_\s.-])(diploma|titulo|acta|graduacion|profesional|certificad)(?:[_\s.-]|$)/i.test(norm) ||
    norm.includes('diploma') ||
    norm.includes('titulo') ||
    norm.includes('acta')
  ) {
    return 'Diploma';
  }

  // Detección de Firma
  if (
    /(?:^|[_\s.-])(firma|signature)(?:[_\s.-]|$)/i.test(norm) ||
    norm.includes('firma')
  ) {
    return 'Firma';
  }

  return undefined;
}

/**
 * Extrae secuencias numéricas (posibles cédulas) del nombre de archivo
 */
function extractNumbers(fileName: string): string[] {
  // Busca secuencias de al menos 4 dígitos
  const matches = fileName.match(/\d{4,12}/g);
  return matches || [];
}

/**
 * Asocia un archivo con un colaborador de la lista
 */
export function matchFileToColaborador(
  file: File,
  colaboradores: Colaborador[]
): FileMatchResult {
  const fileName = file.name;
  const tipo = detectDocumentType(fileName);
  const normFileName = normalizeText(fileName);
  const fileNumbers = extractNumbers(fileName);

  // 1. Intento por Cédula exacta
  for (const colab of colaboradores) {
    const colabCedula = (colab.cedula || '').replace(/\D/g, '');
    if (colabCedula && colabCedula.length >= 4) {
      if (fileNumbers.includes(colabCedula) || normFileName.includes(colabCedula)) {
        return {
          file,
          fileName,
          fileSize: file.size,
          colaboradorId: colab.id,
          colaboradorNombre: colab.nombre,
          colaboradorCedula: colab.cedula,
          tipo,
          confidence: 'exact_cedula',
        };
      }
    }
  }

  // 2. Intento por Nombre
  for (const colab of colaboradores) {
    const normColabName = normalizeText(colab.nombre || '');
    if (!normColabName) continue;

    // Si el nombre completo aparece en el archivo
    if (normFileName.includes(normColabName)) {
      return {
        file,
        fileName,
        fileSize: file.size,
        colaboradorId: colab.id,
        colaboradorNombre: colab.nombre,
        colaboradorCedula: colab.cedula,
        tipo,
        confidence: 'name_match',
      };
    }

    // O si al menos 2 palabras clave del nombre (de longitud >= 3) coinciden
    const tokens = normColabName.split(/\s+/).filter(t => t.length >= 3);
    if (tokens.length >= 2) {
      const matchedTokens = tokens.filter(t => normFileName.includes(t));
      if (matchedTokens.length >= 2) {
        return {
          file,
          fileName,
          fileSize: file.size,
          colaboradorId: colab.id,
          colaboradorNombre: colab.nombre,
          colaboradorCedula: colab.cedula,
          tipo,
          confidence: 'name_match',
        };
      }
    }
  }

  // 3. Sin coincidencia automática
  return {
    file,
    fileName,
    fileSize: file.size,
    colaboradorId: undefined,
    colaboradorNombre: undefined,
    colaboradorCedula: undefined,
    tipo,
    confidence: 'none',
  };
}

