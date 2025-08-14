/**
 * utils/summerAnalysis.js
 * 
 * Responsabilidad: Tomar los datos de verano y realizar todos los análisis
 * estadísticos, devolviendo un único objeto con los resultados.
 */
import { getYear } from 'date-fns';
import _ from 'lodash-es';

/**
 * Calcula de forma robusta la media de una columna, ignorando valores no numéricos.
 * @param {Array<Object>} records - Los registros a promediar.
 * @param {string} column - El nombre de la columna.
 * @returns {number} La media calculada.
 */
const robustMean = (records, column) => {
  const validValues = records
    .map(r => r[column])
    .filter(v => typeof v === 'number' || (typeof v === 'string' && !isNaN(parseFloat(v))))
    .map(v => parseFloat(v));
  
  if (validValues.length === 0) return 0;
  return _.mean(validValues);
};

/**
 * Toma los registros de verano y realiza todos los análisis necesarios.
 * @param {Array<Object>} summerRecords - Array de registros de verano.
 * @returns {Object} Un objeto que contiene todos los resultados del análisis.
 */
export function analyzeSummerData(summerRecords) {
  // --- 1. Análisis del Período Completo ---
  const avgPeriodoTmed = robustMean(summerRecords, 'tmed');
  const avgPeriodoTmax = robustMean(summerRecords, 'tmax');
  const avgPeriodoTmin = robustMean(summerRecords, 'tmin');

  const promediosPeriodo = {
    periodo: `Veranos ${getYear(summerRecords[0].fecha_js)}-${getYear(summerRecords[summerRecords.length - 1].fecha_js)}`,
    promedio_tmed: avgPeriodoTmed.toFixed(2),
    promedio_tmax: avgPeriodoTmax.toFixed(2),
    promedio_tmin: avgPeriodoTmin.toFixed(2),
  };

  // --- 2. Análisis Anual ---
  const summerByYear = _.groupBy(summerRecords, record => getYear(record.fecha_js));
  const desviacionesAnual = [];
  const diasSuperadosAnual = [];
  const promediosAnuales = [];

  for (const year in summerByYear) {
    const yearRecords = summerByYear[year];
    const avgYearTmed = robustMean(yearRecords, 'tmed');
    const avgYearTmax = robustMean(yearRecords, 'tmax');
    const avgYearTmin = robustMean(yearRecords, 'tmin');

    promediosAnuales.push({
      'Año': parseInt(year),
      'Temperatura Media Verano (°C)': avgYearTmed.toFixed(2),
      'Temperatura Mínima Verano (°C)': avgYearTmin.toFixed(2),
      'Temperatura Máxima Verano (°C)': avgYearTmax.toFixed(2),
    });

    desviacionesAnual.push({
      'año': year,
      'desv_tmed': (avgYearTmed - avgPeriodoTmed).toFixed(2),
      'desv_tmax': (avgYearTmax - avgPeriodoTmax).toFixed(2),
      'desv_tmin': (avgYearTmin - avgPeriodoTmin).toFixed(2),
    });

    diasSuperadosAnual.push({
      'año': year,
      'dias_tmed_superada': yearRecords.filter(r => r.tmed > avgPeriodoTmed).length,
      'dias_tmax_superada': yearRecords.filter(r => r.tmax > avgPeriodoTmax).length,
      'dias_tmin_superada': yearRecords.filter(r => r.tmin > avgPeriodoTmin).length,
    });
  }

  // --- 3. Análisis por Décadas ---
  const getDecade = (year) => `${Math.floor(year / 10) * 10}s`;
  const desviacionesPorDecada = _.groupBy(desviacionesAnual, d => getDecade(d.año));
  const diasSuperadosPorDecada = _.groupBy(diasSuperadosAnual, d => getDecade(d.año));

  const desviacionesDecadas = [];
  for (const decada in desviacionesPorDecada) {
    desviacionesDecadas.push({
      'decada': decada,
      'desv_tmed_promedio': robustMean(desviacionesPorDecada[decada], 'desv_tmed'),
      'desv_tmax_promedio': robustMean(desviacionesPorDecada[decada], 'desv_tmax'),
      'desv_tmin_promedio': robustMean(desviacionesPorDecada[decada], 'desv_tmin'),
    });
  }

  const diasSuperadosDecadas = [];
  for (const decada in diasSuperadosPorDecada) {
    diasSuperadosDecadas.push({
      'decada': decada,
      'dias_tmed_superada_promedio': robustMean(diasSuperadosPorDecada[decada], 'dias_tmed_superada'),
      'dias_tmax_superada_promedio': robustMean(diasSuperadosPorDecada[decada], 'dias_tmax_superada'),
      'dias_tmin_superada_promedio': robustMean(diasSuperadosPorDecada[decada], 'dias_tmin_superada'),
    });
  }

  // --- 4. Construir y devolver el objeto de resultados (SSoT) ---
  return {
    promediosPeriodo: [promediosPeriodo],
    analisisAnual: {
      promedios: promediosAnuales,
      desviaciones: desviacionesAnual,
      diasSuperados: diasSuperadosAnual,
    },
    analisisDecadas: {
      desviaciones: desviacionesDecadas,
      diasSuperados: diasSuperadosDecadas,
    },
  };
}
