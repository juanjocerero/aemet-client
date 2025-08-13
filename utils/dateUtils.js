// utils/dateUtils.js
import { min, addMonths, addDays, isBefore, subDays, format } from 'date-fns';

/**
 * Genera rangos de fechas de máximo 6 meses.
 */
export function generarRangosDePeticion(fechaInicioTotal, fechaFinTotal) {
  const rangos = [];
  let cursorFecha = fechaInicioTotal;

  while (isBefore(cursorFecha, fechaFinTotal)) {
    const fechaInicioRango = cursorFecha;
    const fechaFinRango = min([addMonths(cursorFecha, 6), fechaFinTotal]);
    rangos.push({ start: fechaInicioRango, end: fechaFinRango });
    cursorFecha = addDays(fechaFinRango, 1);
  }

  return rangos;
}

/**
 * Formatea un rango de fechas para mostrarlo al usuario de forma legible.
 */
export function formatDisplayDateRange(start, end) {
    const fechaInicioDisplay = format(start, 'dd/MM/yyyy');
    // Se resta un día para que el rango sea más intuitivo (ej: 01/01 a 31/01)
    const fechaFinDisplay = format(subDays(end, 1), 'dd/MM/yyyy');
    return `${fechaInicioDisplay} a ${fechaFinDisplay}`;
}