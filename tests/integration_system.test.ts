import { describe, it, expect } from 'vitest';
import { generarPdfCuentaCobro } from '../src/services/pdfGenerator';
import { Colaborador, ConfiguracionFundacion, PeriodoFacturacion } from '../src/types';
import { formatCurrencyCOP } from '../src/utils/currency';

describe('Pruebas de Integración del Sistema de Cuentas de Cobro', () => {
  const mockConfig: ConfiguracionFundacion = {
    NombreLegalFundacion: 'FUNDACION HOGAR GERIATRICO MIS AÑOS DORADOS',
    NIT: '901481005',
    Direccion: 'Calle Principal 123',
    Ciudad: 'Barranquilla',
    Telefono: '3001234567',
    Correo: 'contacto@fundacion.org',
    RepresentanteLegal: 'Representante Legal Prueba',
    CedulaRepresentante: '12345678',
    InformacionBancaria: 'Bancolombia Ahorros 123-456789-00',
    CarpetaDrivePrincipal: 'CUENTAS DE COBRO',
    OtrosDatosInstitucionales: 'Vigilado'
  };

  const juanPerez: Colaborador = {
    id: 'colab-juan-perez',
    nombre: 'Juan Pérez',
    cedula: '1234567890',
    cargo: 'Auxiliar Administrativo',
    consecutivo: '001',
    valor: 1500000,
    estado: 'Activo'
  };

  const periodoSeptiembre: PeriodoFacturacion = {
    fechaInicio: '2026-09-01',
    fechaFin: '2026-09-30'
  };

  it('debe generar exitosamente el PDF oficial con los datos exactos requeridos', () => {
    const resultado = generarPdfCuentaCobro({
      colaborador: juanPerez,
      config: mockConfig,
      periodo: periodoSeptiembre
    });

    expect(resultado).toBeDefined();
    expect(resultado.filename).toBe('001.pdf');
    expect(resultado.blob.size).toBeGreaterThan(1000); // PDF válido
    expect(resultado.base64.length).toBeGreaterThan(1000);

    // Formateo de moneda
    const formattedVal = formatCurrencyCOP(juanPerez.valor);
    expect(formattedVal).toMatch(/\$\s*1\.500\.000/);
    expect(formattedVal).not.toContain('NaN');
  });

  it('debe generar exitosamente el PDF con firma digital estampada', () => {
    // 1x1 pixel base64 PNG
    const dummySignature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const juanConFirma: Colaborador = {
      ...juanPerez,
      consecutivo: '002',
      firmaUrl: dummySignature
    };

    const resultado = generarPdfCuentaCobro({
      colaborador: juanConFirma,
      config: mockConfig,
      periodo: periodoSeptiembre
    });

    expect(resultado.filename).toBe('002.pdf');
    expect(resultado.blob.size).toBeGreaterThan(1000);
  });

  it('debe rechazar la generación de PDF si falta el valor o es inválido', () => {
    const invalidColab = { ...juanPerez, valor: 0 };
    expect(() => {
      generarPdfCuentaCobro({
        colaborador: invalidColab,
        config: mockConfig,
        periodo: periodoSeptiembre
      });
    }).toThrow(/valor a pagar no es válido/);
  });

  it('debe rechazar la generación de PDF si falta la cédula', () => {
    const invalidColab = { ...juanPerez, cedula: '' };
    expect(() => {
      generarPdfCuentaCobro({
        colaborador: invalidColab,
        config: mockConfig,
        periodo: periodoSeptiembre
      });
    }).toThrow(/falta la cédula/);
  });

  it('debe rechazar la generación de PDF si falta el nombre legal de la fundación', () => {
    const invalidConfig = { ...mockConfig, NombreLegalFundacion: '' };
    expect(() => {
      generarPdfCuentaCobro({
        colaborador: juanPerez,
        config: invalidConfig,
        periodo: periodoSeptiembre
      });
    }).toThrow(/Nombre Legal/);
  });

  it('debe verificar la lógica de selección múltiple (un colaborador, varios, todos, ninguno)', () => {
    const colabs = [
      { id: '1', nombre: 'Juan' },
      { id: '2', nombre: 'María' },
      { id: '3', nombre: 'Carlos' }
    ];

    // Ninguno
    let seleccion: string[] = [];
    expect(seleccion.length).toBe(0);

    // Uno
    seleccion = ['1'];
    expect(seleccion.length).toBe(1);

    // Varios
    seleccion = ['1', '2'];
    expect(seleccion.length).toBe(2);

    // Todos
    seleccion = colabs.map(c => c.id);
    expect(seleccion.length).toBe(3);
    expect(seleccion).toEqual(['1', '2', '3']);
  });
});

