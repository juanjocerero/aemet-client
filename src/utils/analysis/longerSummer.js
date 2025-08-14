/**
 * utils/analysis/longerSummer.js
 * 
 * Responsabilidad: Calcular la duración del "verano meteorológico" para cada año
 * basándose en una media móvil de temperatura.
 */
import { getYear, differenceInDays, parseISO } from 'date-fns';
import _ from 'lodash-es';

const TEMPERATURE_THRESHOLD = 30; // Umbral de temperatura para considerar un día "de verano"
const MOVING_AVERAGE_WINDOW = 7;  // Días para la media móvil

/**
 * Calcula la duración del verano meteorológico para cada año en el conjunto de datos.
 * @param {Array<Object>} allRecords - Todos los registros climáticos del período.
 * @returns {Array<Object>} Un array con la duración del verano para cada año.
 */
export function calculateLongerSummer(allRecords) {
  const results = [];
  const recordsByYear = _.groupBy(allRecords, r => getYear(r.fecha_js));

  for (const year in recordsByYear) {
    const yearRecords = recordsByYear[year];
    if (yearRecords.length < MOVING_AVERAGE_WINDOW) continue; // No se puede calcular

    // Calcular la media móvil de 7 días para tmed
    const movingAverages = [];
    for (let i = 0; i <= yearRecords.length - MOVING_AVERAGE_WINDOW; i++) {
      const window = yearRecords.slice(i, i + MOVING_AVERAGE_WINDOW);
      const mean = _.meanBy(window.filter(r => r.tmed !== null), 'tmed');
      movingAverages.push({ 
        date: window[MOVING_AVERAGE_WINDOW - 1].fecha_js, // Fecha del último día de la ventana
        avg: mean 
      });
    }

    // Encontrar el inicio y fin del verano meteorológico
    const summerDays = movingAverages.filter(d => d.avg > TEMPERATURE_THRESHOLD);
    if (summerDays.length === 0) continue;

    const firstSummerDay = summerDays[0].date;
    const lastSummerDay = summerDays[summerDays.length - 1].date;

    // Calcular la duración
    const duration = differenceInDays(lastSummerDay, firstSummerDay) + 1;

    results.push({
      'año': year,
      'duracion_verano_dias': duration,
    });
  }

  return results;
}
