import { describe, it, expect } from 'vitest';
import { HistorialCuenta } from '../src/types';

describe('Pruebas de Detección de Duplicados en Historial', () => {
  const historialMock: HistorialCuenta[] = [
    {
      id: 'h1',
      colaborador: 'Juan Pérez',
      cedula: '1234567890',
      periodoInicio: '2026-09-01',
      periodoFin: '2026-09-30',
      consecutivo: '001',
      valor: 1500000,
      fechaGeneracion: '2026-09-30T10:00:00.000Z',
      nombreArchivo: 'Cuenta de cobro - Juan Pérez - Septiembre 2026.pdf',
      driveFileId: 'drive-123',
      driveUrl: 'https://drive.google.com/file/d/drive-123/view',
      estado: 'Generado'
    }
  ];

  function checkDuplicateLocal(
    list: HistorialCuenta[],
    colaborador: string,
    periodoInicio: string,
    periodoFin: string,
    consecutivo: string
  ): boolean {
    const cNorm = colaborador.trim().toLowerCase();
    const piNorm = periodoInicio.trim();
    const pfNorm = periodoFin.trim();
    const consNorm = consecutivo.trim().toLowerCase();

    return list.some(h =>
      h.colaborador.trim().toLowerCase() === cNorm &&
      h.periodoInicio.trim() === piNorm &&
      h.periodoFin.trim() === pfNorm &&
      h.consecutivo.trim().toLowerCase() === consNorm
    );
  }

  it('debe detectar cuenta duplicada si coincide colaborador, periodo y consecutivo', () => {
    const exists = checkDuplicateLocal(
      historialMock,
      'Juan Pérez',
      '2026-09-01',
      '2026-09-30',
      '001'
    );
    expect(exists).toBe(true);
  });

  it('no debe marcar duplicado si el periodo cambia', () => {
    const exists = checkDuplicateLocal(
      historialMock,
      'Juan Pérez',
      '2026-10-01',
      '2026-10-31',
      '001'
    );
    expect(exists).toBe(false);
  });

  it('no debe marcar duplicado si el consecutivo cambia', () => {
    const exists = checkDuplicateLocal(
      historialMock,
      'Juan Pérez',
      '2026-09-01',
      '2026-09-30',
      '002'
    );
    expect(exists).toBe(false);
  });
});

