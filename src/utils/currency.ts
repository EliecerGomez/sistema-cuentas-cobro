/**
 * Utilidades para el manejo de moneda en Pesos Colombianos (COP)
 * Garantiza integridad absoluta y evita la aparición de $NaN, undefined o null.
 */

/**
 * Convierte cualquier entrada (número o cadena con puntos, comas, signos $)
 * a un número entero limpio en pesos colombianos.
 * Retorna null si la entrada no es un valor numérico válido.
 */
export function parseCurrencyCOP(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;

  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) return null;
    return Math.round(input);
  }

  const str = String(input).trim();
  if (str === '') return null;

  // Elimina signos de peso, espacios, caracteres no numéricos excepto coma o punto
  // Si viene con formato "1.500.000", quitamos los puntos de miles
  let cleaned = str.replace(/[\$\s]/g, '');

  // Manejar separadores: si contiene puntos como separadores de miles
  // Ej: "1.500.000" -> "1500000"
  // Si contiene coma decimal "1500000,00", se extrae la parte entera
  if (cleaned.includes('.') && cleaned.includes(',')) {
    // Caso 1.500.000,00 (formato estándar COP)
    cleaned = cleaned.replace(/\./g, '').split(',')[0];
  } else if (cleaned.includes('.')) {
    // Si tiene varios puntos o un punto con 3 dígitos finales, son miles
    const parts = cleaned.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      cleaned = cleaned.replace(/\./g, '');
    } else if (parts.length === 2 && parts[1].length <= 2) {
      // Punto decimal "1500000.50"
      cleaned = parts[0];
    } else {
      cleaned = cleaned.replace(/\./g, '');
    }
  } else if (cleaned.includes(',')) {
    // Si contiene coma, verificar si es decimal o miles
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      cleaned = parts[0];
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const parsed = Number(cleaned);
  if (isNaN(parsed) || !isFinite(parsed)) return null;

  return Math.round(parsed);
}

/**
 * Valida si un valor es un monto monetario válido y positivo (> 0)
 */
export function isValidCurrencyCOP(input: string | number | null | undefined): boolean {
  const parsed = parseCurrencyCOP(input);
  return parsed !== null && parsed > 0;
}

/**
 * Formatea un valor a formato monetario oficial colombiano: $ 1.500.000
 * NUNCA retornará NaN, $NaN, undefined o null.
 */
export function formatCurrencyCOP(amount: string | number | null | undefined): string {
  const parsed = parseCurrencyCOP(amount);
  if (parsed === null) {
    return '$ 0';
  }

  // Formateador con puntos de miles para Colombia
  const formattedNumber = new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(parsed);

  return `$ ${formattedNumber}`;
}

