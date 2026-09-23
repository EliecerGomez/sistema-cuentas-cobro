import { describe, it, expect } from 'vitest';
import { detectDocumentType, matchFileToColaborador } from '../src/utils/fileMatcher';
import { Colaborador } from '../src/types';

describe('fileMatcher utility', () => {
  const mockColaboradores: Colaborador[] = [
    {
      id: '1',
      nombre: 'Juan Pérez Gómez',
      cedula: '1002345678',
      cargo: 'Abogado',
      consecutivo: '001',
      valor: 1500000,
      estado: 'Activo',
    },
    {
      id: '2',
      nombre: 'María Camila Rodriguez',
      cedula: '52987654',
      cargo: 'Contadora',
      consecutivo: '002',
      valor: 2000000,
      estado: 'Activo',
    },
  ];

  it('detecta correctamente tipos de documentos por nombre', () => {
    expect(detectDocumentType('CC_1002345678.pdf')).toBe('CC');
    expect(detectDocumentType('cedula_maria.png')).toBe('CC');
    expect(detectDocumentType('RUT_1002345678_2026.pdf')).toBe('RUT');
    expect(detectDocumentType('rut-actualizado.pdf')).toBe('RUT');
    expect(detectDocumentType('Diploma_Profesional.pdf')).toBe('Diploma');
    expect(detectDocumentType('acta_grado.jpg')).toBe('Diploma');
    expect(detectDocumentType('firma_juan_perez.png')).toBe('Firma');
    expect(detectDocumentType('archivo_desconocido.txt')).toBeUndefined();
  });

  it('asocia archivo a colaborador por cédula en el nombre', () => {
    const file = new File(['dummy'], 'CC_1002345678.pdf', { type: 'application/pdf' });
    const result = matchFileToColaborador(file, mockColaboradores);

    expect(result.colaboradorId).toBe('1');
    expect(result.colaboradorNombre).toBe('Juan Pérez Gómez');
    expect(result.tipo).toBe('CC');
    expect(result.confidence).toBe('exact_cedula');
  });

  it('asocia archivo a colaborador por nombre aproximado', () => {
    const file = new File(['dummy'], 'RUT Maria Camila.pdf', { type: 'application/pdf' });
    const result = matchFileToColaborador(file, mockColaboradores);

    expect(result.colaboradorId).toBe('2');
    expect(result.colaboradorNombre).toBe('María Camila Rodriguez');
    expect(result.tipo).toBe('RUT');
    expect(result.confidence).toBe('name_match');
  });

  it('retorna none cuando no hay coincidencia', () => {
    const file = new File(['dummy'], 'documento_aleatorio.pdf', { type: 'application/pdf' });
    const result = matchFileToColaborador(file, mockColaboradores);

    expect(result.colaboradorId).toBeUndefined();
    expect(result.confidence).toBe('none');
  });
});

