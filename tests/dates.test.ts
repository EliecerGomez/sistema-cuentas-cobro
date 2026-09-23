import { describe, it, expect } from 'vitest';
import {
  validateDateRange,
  formatDateDMY,
  getMonthYearSpanish
} from '../src/utils/dates';

describe('Pruebas Obligatorias de Fechas y Periodos', () => {
  it('debe aceptar un rango de fechas válido donde fin >= inicio', () => {
    const res = validateDateRange('2026-09-01', '2026-09-30');
    expect(res.valid).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it('debe rechazar un rango donde la fecha final es menor que la inicial', () => {
    const res = validateDateRange('2026-09-30', '2026-09-01');
    expect(res.valid).toBe(false);
    expect(res.error).toBe('La fecha final no puede ser anterior a la fecha inicial.');
  });

  it('debe rechazar campos de fecha vacíos', () => {
    expect(validateDateRange('', '2026-09-30').valid).toBe(false);
    expect(validateDateRange('2026-09-01', '').valid).toBe(false);
    expect(validateDateRange('', '').valid).toBe(false);
  });

  it('debe formatear correctamente a DD/MM/YYYY', () => {
    expect(formatDateDMY('2026-09-01')).toBe('01/09/2026');
    expect(formatDateDMY('2026-09-30')).toBe('30/09/2026');
  });

  it('debe obtener correctamente el mes en español y la carpeta de Drive', () => {
    const res = getMonthYearSpanish('2026-09-30');
    expect(res.year).toBe('2026');
    expect(res.monthNumber).toBe('09');
    expect(res.monthName).toBe('Septiembre');
    expect(res.folderName).toBe('09 - Septiembre');
  });
});

