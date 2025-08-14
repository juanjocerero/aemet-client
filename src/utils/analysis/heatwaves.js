/**
 * utils/analysis/heatwaves.js
 * 
 * Responsabilidad: Identificar y analizar las olas de calor en un conjunto de datos.
 */
import { getYear } from 'date-fns';
import _ from 'lodash-es';

const HEATWAVE_MIN_DAYS = 3; // Mínimo de días consecutivos para ser una ola de calor
const REFERENCE_YEARS = 30;    // Años a usar para el período de referencia (e.g., 1971-2000)
const PERCENTILE = 0.95;       // Percentil para definir la temperatura umbral

/**
 * Calcula el percentil de una serie de números.
 */
const getPercentile = (numbers, percentile) => {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const index = Math.floor(percentile * sorted.length);
  return sorted[index];
};

/**
 * Analiza un conjunto de registros de verano para extraer métricas de olas de calor.
 * @param {Array<Object>} summerRecords - Todos los registros de veranos.
 * @returns {Array<Object>} Un array con las métricas de olas de calor para cada año.
 */
export function calculateHeatwaveMetrics(summerRecords) {
  if (summerRecords.length === 0) return [];

  // 1. Establecer el período de referencia y calcular el umbral de Tmax
  const firstYear = getYear(summerRecords[0].fecha_js);
  const referenceEndYear = firstYear + REFERENCE_YEARS - 1;
  const referenceRecords = summerRecords.filter(r => getYear(r.fecha_js) <= referenceEndYear);
  
  const tmaxValues = referenceRecords.map(r => r.tmax).filter(t => t !== null);
  if (tmaxValues.length === 0) return []; // No se puede calcular el umbral
  
  const heatwaveThreshold = getPercentile(tmaxValues, PERCENTILE);

  // 2. Identificar todas las olas de calor en todo el período
  const allHeatwaves = [];
  let currentStreak = [];

  for (const record of summerRecords) {
    if (record.tmax > heatwaveThreshold) {
      currentStreak.push(record);
    } else {
      if (currentStreak.length >= HEATWAVE_MIN_DAYS) {
        allHeatwaves.push(currentStreak);
      }
      currentStreak = []; // Reiniciar la racha
    }
  }
  // Comprobar la última racha al final del bucle
  if (currentStreak.length >= HEATWAVE_MIN_DAYS) {
    allHeatwaves.push(currentStreak);
  }

  if (allHeatwaves.length === 0) return [];

  // 3. Agrupar las olas de calor por año y calcular métricas
  const heatwavesByYear = _.groupBy(allHeatwaves, wave => getYear(wave[0].fecha_js));
  const results = [];

  // Asegurarnos de que todos los años del período están en los resultados, incluso si tienen 0 olas
  const allYears = _.uniq(summerRecords.map(r => getYear(r.fecha_js)));

  for (const year of allYears) {
    const yearWaves = heatwavesByYear[year] || [];
    
    if (yearWaves.length > 0) {
      const totalDays = _.sumBy(yearWaves, 'length');
      const totalTmax = _.sumBy(yearWaves, wave => _.sumBy(wave, 'tmax'));
      
      results.push({
        'año': year,
        'frecuencia': yearWaves.length,
        'duracion_media_dias': Math.round(_.meanBy(yearWaves, 'length')),
        'intensidad_media_tmax': totalTmax / totalDays,
      });
    } else {
      results.push({
        'año': year,
        'frecuencia': 0,
        'duracion_media_dias': 0,
        'intensidad_media_tmax': 0,
      });
    }
  }

  return results;
}
