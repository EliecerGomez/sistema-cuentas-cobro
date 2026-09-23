/**
 * Utilidades para el manejo de fechas y periodos
 */

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Convierte una fecha YYYY-MM-DD o Date a DD/MM/YYYY
 */
export function formatDateDMY(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    // Si viene en formato YYYY-MM-DD
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Valida un rango de fechas de periodo
 */
export function validateDateRange(startStr: string, endStr: string): { valid: boolean; error?: string } {
  if (!startStr || startStr.trim() === '') {
    return { valid: false, error: 'La fecha de inicio es obligatoria.' };
  }
  if (!endStr || endStr.trim() === '') {
    return { valid: false, error: 'La fecha de finalización es obligatoria.' };
  }

  const start = new Date(startStr);
  const end = new Date(endStr);

  if (isNaN(start.getTime())) {
    return { valid: false, error: 'La fecha de inicio no tiene un formato válido.' };
  }
  if (isNaN(end.getTime())) {
    return { valid: false, error: 'La fecha de finalización no tiene un formato válido.' };
  }

  // Comparar sólo año, mes y día
  const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();

  if (endTime < startTime) {
    return { valid: false, error: 'La fecha final no puede ser anterior a la fecha inicial.' };
  }

  return { valid: true };
}

/**
 * Obtiene la información detallada del mes y año en español
 * a partir de una fecha final de periodo para la estructura de carpetas de Drive
 */
export function getMonthYearSpanish(dateStr: string): {
  year: string;
  monthNumber: string;
  monthName: string;
  folderName: string;
} {
  const d = new Date(dateStr);
  const now = new Date();
  const targetDate = isNaN(d.getTime()) ? now : d;

  const year = String(targetDate.getFullYear());
  const monthIndex = targetDate.getMonth();
  const monthNumber = String(monthIndex + 1).padStart(2, '0');
  const monthName = MESES_ES[monthIndex] || 'General';
  const folderName = `${monthNumber} - ${monthName}`;

  return {
    year,
    monthNumber,
    monthName,
    folderName
  };
}

/**
 * Obtiene el rango del mes actual por defecto en formato YYYY-MM-DD
 */
export function getDefaultPeriodDates(): { inicio: string; fin: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const format = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    inicio: format(firstDay),
    fin: format(lastDay)
  };
}

