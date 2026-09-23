import { describe, it, expect } from 'vitest';
import { generarCuentaCobroPdf, generarCuentaCobroCompletaPdf } from '../src/services/pdfGenerator';
import { Colaborador, ConfiguracionFundacion, PeriodoFacturacion } from '../src/types';
import { PDFDocument } from 'pdf-lib';

describe('PDF merge and unification', () => {
  const mockConfig: ConfiguracionFundacion = {
    NIT: '900.123.456-7',
    NombreLegalFundacion: 'Fundación Pro Bienestar Social',
    RepresentanteLegal: 'María Rodríguez',
    Banco: 'Bancolombia',
    TipoCuenta: 'Ahorros',
    NumeroCuenta: '123-456789-00',
  };

  const mockPeriodo: PeriodoFacturacion = {
    fechaInicio: '2026-09-01',
    fechaFin: '2026-09-30',
    descripcionPeriodo: 'Septiembre 2026',
  };

  it('genera cuenta base de 1 sola página si no hay soportes', async () => {
    const colab: Colaborador = {
      id: '1',
      nombre: 'Juan Pérez',
      cedula: '1002345678',
      cargo: 'Coordinador Social',
      consecutivo: '001',
      valor: 1500000,
      estado: 'Activo',
    };

    const result = await generarCuentaCobroCompletaPdf({
      colaborador: colab,
      config: mockConfig,
      periodo: mockPeriodo,
      unirSoportes: true,
    });

    expect(result.filename).toBe('001.pdf');
    const pdfDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(pdfDoc.getPageCount()).toBe(1);
  });

  it('concatena soporte PDF al documento unificado', async () => {
    // Crear un PDF de soporte de prueba de 2 páginas
    const supportDoc = await PDFDocument.create();
    supportDoc.addPage([595.28, 841.89]);
    supportDoc.addPage([595.28, 841.89]);
    const supportBytes = await supportDoc.save();
    let binary = '';
    for (let i = 0; i < supportBytes.length; i++) {
      binary += String.fromCharCode(supportBytes[i]);
    }
    const supportDataUrl = `data:application/pdf;base64,${btoa(binary)}`;

    const colab: Colaborador = {
      id: '2',
      nombre: 'Carlos Mario Ruiz',
      cedula: '71234567',
      cargo: 'Docente Formador',
      consecutivo: '002',
      valor: 2000000,
      estado: 'Activo',
      ccUrl: supportDataUrl, // Cédula de 2 páginas
    };

    const result = await generarCuentaCobroCompletaPdf({
      colaborador: colab,
      config: mockConfig,
      periodo: mockPeriodo,
      unirSoportes: true,
    });

    const pdfDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    // 1 página de la cuenta de cobro + 2 páginas del soporte CC = 3 páginas
    expect(pdfDoc.getPageCount()).toBe(3);
    expect(result.filename).toBe('002.pdf');
  });

  it('no une soportes si unirSoportes es false', async () => {
    const colab: Colaborador = {
      id: '3',
      nombre: 'Ana López',
      cedula: '32123456',
      cargo: 'Psicóloga',
      consecutivo: '003',
      valor: 1800000,
      estado: 'Activo',
      ccUrl: 'data:application/pdf;base64,dummy',
    };

    const result = await generarCuentaCobroCompletaPdf({
      colaborador: colab,
      config: mockConfig,
      periodo: mockPeriodo,
      unirSoportes: false,
    });

    const pdfDoc = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(pdfDoc.getPageCount()).toBe(1);
  });
});

