/**
 * Utilidades para sanitización de nombres de archivo y cadenas seguras
 */

/**
 * Elimina caracteres no permitidos en sistemas de archivos (Windows) y Google Drive:
 * \ / : * ? " < > |
 */
export function sanitizeFilename(name: string): string {
  if (!name) return 'documento.pdf';

  // Reemplazar caracteres prohibidos por guiones
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '-').trim();

  // Reemplazar múltiples espacios o guiones consecutivos
  return cleaned.replace(/\s+/g, ' ').replace(/-+/g, '-');
}

/**
 * Genera el nombre de descarga y almacenamiento de la cuenta de cobro basado en el consecutivo:
 * [Consecutivo].pdf (ej. 001.pdf)
 */
export function generateCuentaPdfFilename(consecutivo: string): string {
  const base = `${(consecutivo || '001').trim()}.pdf`;
  return sanitizeFilename(base);
}

