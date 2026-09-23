import { describe, it, expect } from 'vitest';
import { sanitizeFilename, generateCuentaPdfFilename } from '../src/utils/sanitizer';

describe('Pruebas de Sanitización de Nombres de Archivo', () => {
  it('debe limpiar caracteres prohibidos en Windows y Google Drive', () => {
    const problematico = 'Cuenta / de : cobro * "Juan | Pérez" <001>?';
    const sanitizado = sanitizeFilename(problematico);

    expect(sanitizado).not.toMatch(/[\\/:*?"<>|]/);
    expect(sanitizado).toContain('Juan');
    expect(sanitizado).toContain('Pérez');
  });

  it('debe generar el nombre basado en el consecutivo para descarga rápida', () => {
    expect(generateCuentaPdfFilename('001')).toBe('001.pdf');
    expect(generateCuentaPdfFilename('FUNMIADOR/001')).toBe('FUNMIADOR-001.pdf');
  });
});

