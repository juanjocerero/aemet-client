/**
 * utils/analysis/thresholds.js
 * 
 * Calcula métricas basadas en el cruce de umbrales de temperatura.
 */

/**
 * Calcula el número de "Noches Tropicales" y "Días de Horno" para un conjunto de registros.
 * @param {Array<Object>} records - Array de registros (normalmente de un verano).
 * @returns {{nochesTropicales: number, diasDeHorno: number}}
 */
export function calculateThresholds(records) {
  const nochesTropicales = records.filter(r => r.tmin >= 20).length;
  const diasDeHorno = records.filter(r => r.tmax >= 40).length;
  
  return { nochesTropicales, diasDeHorno };
}
