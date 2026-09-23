import { describe, it, expect } from 'vitest';
import {
  formatCurrencyCOP,
  parseCurrencyCOP,
  isValidCurrencyCOP
} from '../src/utils/currency';

describe('Pruebas Obligatorias de Manejo Monetario COP', () => {
  it('debe parsear y formatear correctamente un número directo 1500000', () => {
    const raw = 1500000;
    expect(parseCurrencyCOP(raw)).toBe(1500000);
    expect(isValidCurrencyCOP(raw)).toBe(true);

    const formatted = formatCurrencyCOP(raw);
    expect(formatted).toMatch(/\$\s*1\.500\.000/);
    expect(formatted).not.toContain('NaN');
    expect(formatted).not.toContain('undefined');
    expect(formatted).not.toContain('null');
  });

  it('debe parsear y formatear correctamente la cadena "1500000"', () => {
    const raw = '1500000';
    expect(parseCurrencyCOP(raw)).toBe(1500000);
    expect(isValidCurrencyCOP(raw)).toBe(true);

    const formatted = formatCurrencyCOP(raw);
    expect(formatted).toMatch(/\$\s*1\.500\.000/);
    expect(formatted).not.toContain('NaN');
  });

  it('debe parsear y formatear correctamente la cadena con puntos "1.500.000"', () => {
    const raw = '1.500.000';
    expect(parseCurrencyCOP(raw)).toBe(1500000);
    expect(isValidCurrencyCOP(raw)).toBe(true);

    const formatted = formatCurrencyCOP(raw);
    expect(formatted).toMatch(/\$\s*1\.500\.000/);
    expect(formatted).not.toContain('NaN');
  });

  it('debe parsear y formatear correctamente la cadena con símbolo "$1.500.000"', () => {
    const raw = '$1.500.000';
    expect(parseCurrencyCOP(raw)).toBe(1500000);
    expect(isValidCurrencyCOP(raw)).toBe(true);

    const formatted = formatCurrencyCOP(raw);
    expect(formatted).toMatch(/\$\s*1\.500\.000/);
    expect(formatted).not.toContain('NaN');
  });

  it('debe rechazar valores vacíos o nulos', () => {
    expect(parseCurrencyCOP('')).toBeNull();
    expect(parseCurrencyCOP('   ')).toBeNull();
    expect(parseCurrencyCOP(null)).toBeNull();
    expect(parseCurrencyCOP(undefined)).toBeNull();

    expect(isValidCurrencyCOP('')).toBe(false);
    expect(isValidCurrencyCOP(null)).toBe(false);

    expect(formatCurrencyCOP('')).toBe('$ 0');
    expect(formatCurrencyCOP(null)).toBe('$ 0');
    expect(formatCurrencyCOP(undefined)).toBe('$ 0');
  });

  it('debe rechazar valores negativos o menores o iguales a cero', () => {
    expect(isValidCurrencyCOP(-1500000)).toBe(false);
    expect(isValidCurrencyCOP(0)).toBe(false);
    expect(isValidCurrencyCOP('-5000')).toBe(false);
  });

  it('debe rechazar texto inválido sin producir NaN en la interfaz', () => {
    const raw = 'abcTextoInvalido';
    expect(parseCurrencyCOP(raw)).toBeNull();
    expect(isValidCurrencyCOP(raw)).toBe(false);

    const formatted = formatCurrencyCOP(raw);
    expect(formatted).toBe('$ 0');
    expect(formatted).not.toContain('NaN');
    expect(formatted).not.toContain('undefined');
  });
});

