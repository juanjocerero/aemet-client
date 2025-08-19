/**
 * utils/summerAnalysis.js
 * 
 * Responsabilidad: Orquestar todos los análisis y devolver un único objeto con los resultados.
 */
import { getYear, startOfDay, isWithinInterval } from 'date-fns';
import _ from 'lodash-es';
import { calculateThresholds } from './analysis/thresholds.js';
import { calculateLongerSummer } from './analysis/longerSummer.js';
import { calculateHeatwaveMetrics } from './analysis/heatwaves.js';

const robustMean = (records, column) => {
  const validValues = records
    .map(r => r[column])
    .filter(v => typeof v === 'number' || (typeof v === 'string' && !isNaN(parseFloat(v))))
    .map(v => parseFloat(v));
  if (validValues.length === 0) return 0;
  return _.mean(validValues);
};

const filterSummerRecords = (allRecords) => {
  return allRecords.filter(record => {
    const year = getYear(record.fecha_js);
    const summerStart = startOfDay(new Date(year, 5, 21));
    const autumnStart = startOfDay(new Date(year, 8, 22));
    return isWithinInterval(record.fecha_js, { start: summerStart, end: autumnStart });
  });
};

/**
 * Orquesta todos los análisis.
 * @param {Array<Object>} allRecords - Array con TODOS los registros del año.
 * @returns {Object} Un objeto que contiene todos los resultados del análisis.
 */
export function analyzeSummerData(allRecords) {
  const summerRecords = filterSummerRecords(allRecords);
  if (summerRecords.length === 0) {
    throw new Error('No se encontraron datos de verano en el período especificado.');
  }

  // --- 1. Análisis del Período Completo (sobre datos de verano) ---
  const avgPeriodoTmed = robustMean(summerRecords, 'tmed');
  const avgPeriodoTmax = robustMean(summerRecords, 'tmax');
  const avgPeriodoTmin = robustMean(summerRecords, 'tmin');
  const promediosPeriodo = {
    periodo: `Veranos ${getYear(summerRecords[0].fecha_js)}-${getYear(summerRecords[summerRecords.length - 1].fecha_js)}`,
    promedio_tmed: avgPeriodoTmed.toFixed(2),
    promedio_tmax: avgPeriodoTmax.toFixed(2),
    promedio_tmin: avgPeriodoTmin.toFixed(2),
  };

  // --- 2. Análisis Anuales (sobre datos de verano) ---
  const summerByYear = _.groupBy(summerRecords, record => getYear(record.fecha_js));
  const promediosAnuales = [];
  const desviacionesAnual = [];
  const diasSuperadosAnual = [];
  const umbralesAnual = [];

  for (const year in summerByYear) {
    const yearRecords = summerByYear[year];
    const avgYearTmed = robustMean(yearRecords, 'tmed');
    const avgYearTmax = robustMean(yearRecords, 'tmax');
    const avgYearTmin = robustMean(yearRecords, 'tmin');

    // Añadimos también los máximos para la tabla resumen
    const maxYearTmed = _.maxBy(yearRecords, 'tmed')?.tmed ?? null;
    const maxYearTmax = _.maxBy(yearRecords, 'tmax')?.tmax ?? null;
    const maxYearTmin = _.maxBy(yearRecords, 'tmin')?.tmin ?? null;

    promediosAnuales.push({
      año: parseInt(year),
      avg_tmed: avgYearTmed,
      avg_tmax: avgYearTmax,
      avg_tmin: avgYearTmin,
      max_tmed: maxYearTmed,
      max_tmax: maxYearTmax,
      max_tmin: maxYearTmin,
    });

    desviacionesAnual.push({ 'año': year, 'desv_tmed': (avgYearTmed - avgPeriodoTmed).toFixed(2), 'desv_tmax': (avgYearTmax - avgPeriodoTmax).toFixed(2), 'desv_tmin': (avgYearTmin - avgPeriodoTmin).toFixed(2) });
    diasSuperadosAnual.push({ 'año': year, 'dias_tmed_superada': yearRecords.filter(r => r.tmed > avgPeriodoTmed).length, 'dias_tmax_superada': yearRecords.filter(r => r.tmax > avgPeriodoTmax).length, 'dias_tmin_superada': yearRecords.filter(r => r.tmin > avgPeriodoTmin).length });
    
    const { nochesTropicales, diasDeHorno } = calculateThresholds(yearRecords);
    umbralesAnual.push({ 'año': year, 'noches_tropicales': nochesTropicales, 'dias_de_horno_40c': diasDeHorno });
  }

  // --- 3. Análisis de Olas de Calor y Duración de Verano ---
  const olasCalorAnual = calculateHeatwaveMetrics(summerRecords);
  const duracionVeranoAnual = calculateLongerSummer(allRecords);

  // --- 4. Análisis por Décadas ---
  const getDecade = (year) => `${Math.floor(year / 10) * 10}s`;
  const desviacionesDecadas = _.chain(desviacionesAnual).groupBy(d => getDecade(d.año)).map((values, key) => ({ decada: key, desv_tmed_promedio: robustMean(values, 'desv_tmed'), desv_tmax_promedio: robustMean(values, 'desv_tmax'), desv_tmin_promedio: robustMean(values, 'desv_tmin') })).value();
  const diasSuperadosDecadas = _.chain(diasSuperadosAnual).groupBy(d => getDecade(d.año)).map((values, key) => ({ decada: key, dias_tmed_superada_promedio: robustMean(values, 'dias_tmed_superada'), dias_tmax_superada_promedio: robustMean(values, 'dias_tmax_superada'), dias_tmin_superada_promedio: robustMean(values, 'dias_tmin_superada') })).value();
  const umbralesDecadas = _.chain(umbralesAnual).groupBy(d => getDecade(d.año)).map((values, key) => ({ decada: key, noches_tropicales_promedio: robustMean(values, 'noches_tropicales'), dias_de_horno_40c_promedio: robustMean(values, 'dias_de_horno_40c') })).value();
  const duracionVeranoDecadas = _.chain(duracionVeranoAnual).groupBy(d => getDecade(d.año)).map((values, key) => ({ decada: key, duracion_media_dias: robustMean(values, 'duracion_verano_dias') })).value();
  const olasCalorDecadas = _.chain(olasCalorAnual).groupBy(d => getDecade(d.año)).map((values, key) => ({
    decada: key,
    frecuencia_total: _.sumBy(values, 'frecuencia'),
    frecuencia_promedio_anual: robustMean(values, 'frecuencia'),
    duracion_media_dias: robustMean(values, 'duracion_media_dias'),
    intensidad_media_tmax: robustMean(values, 'intensidad_media_tmax'),
    intensidad_media_tmed: robustMean(values, 'intensidad_media_tmed'),
  })).value();

  const diasSuperadosDecadasTotales = _.chain(diasSuperadosAnual)
    .groupBy(d => getDecade(d.año))
    .map((values, key) => ({
      decada: key,
      dias_tmed_superada_total: _.sumBy(values, 'dias_tmed_superada'),
      dias_tmax_superada_total: _.sumBy(values, 'dias_tmax_superada'),
      dias_tmin_superada_total: _.sumBy(values, 'dias_tmin_superada'),
    })).value();

  const umbralesDecadasTotales = _.chain(umbralesAnual)
    .groupBy(d => getDecade(d.año))
    .map((values, key) => ({
      decada: key,
      noches_tropicales_total: _.sumBy(values, 'noches_tropicales'),
      dias_de_horno_40c_total: _.sumBy(values, 'dias_de_horno_40c'),
    })).value();

  // --- 5. Construir y devolver el objeto de resultados (SSoT) ---
  return {
    promediosPeriodo: [promediosPeriodo],
    analisisAnual: {
      promedios: promediosAnuales,
      desviaciones: desviacionesAnual,
      diasSuperados: diasSuperadosAnual,
      umbrales: umbralesAnual,
      duracionVerano: duracionVeranoAnual,
      olasDeCalor: olasCalorAnual,
    },
    analisisDecadas: {
      desviaciones: desviacionesDecadas,
      diasSuperados: diasSuperadosDecadas,
      diasSuperadosTotales: diasSuperadosDecadasTotales,
      umbrales: umbralesDecadas,
      umbralesTotales: umbralesDecadasTotales,
      duracionVerano: duracionVeranoDecadas,
      olasDeCalor: olasCalorDecadas,
    },
  };
}
