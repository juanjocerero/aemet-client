/**
 * scripts/generate-climate-stripes-data.js
 *
 * Responsabilidad: Generar el conjunto de datos para la visualización
 * de las "climate stripes" anuales. Lee los datos diarios, los procesa
 * para todo el año, calcula métricas de olas de calor y genera un JSON final.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import _ from 'lodash-es';
import { getYear, getDaysInYear, eachDayOfInterval, format, startOfYear, endOfYear } from 'date-fns';
import { readAndProcessData } from '../src/utils/dataLoader.js';
import { logger } from '../src/utils/consoleLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURACIÓN ---
const DATA_FILE = path.join(__dirname, '..', 'datos_5530E_19720101_20250819', 'diarios_5530E_19720101_20250819.csv');
const OUTPUT_DIR = path.join(__dirname, '..', 'visualizacion');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'climate-stripes.json');

const START_YEAR = 1972;
const END_YEAR = 2025;

// --- LÓGICA DE OLAS DE CALOR (Adaptada de heatwaves.js) ---
const HEATWAVE_MIN_DAYS = 3;
const REFERENCE_START_YEAR = 1972;
const REFERENCE_END_YEAR = 2001; // Período de referencia de 30 años
const PERCENTILE = 0.95;

const getPercentile = (numbers, percentile) => {
  const sorted = numbers.slice().sort((a, b) => a - b);
  const index = Math.floor(percentile * sorted.length);
  return sorted[index];
};

// --- SCRIPT PRINCIPAL ---
async function generateClimateStripesData() {
  try {
    logger.info(`Leyendo y procesando datos de ${path.basename(DATA_FILE)}...`);
    const allRecords = await readAndProcessData(DATA_FILE);
    logger.info(`  - ${allRecords.length} registros leídos y normalizados.`);

    // 1. Calcular umbral de ola de calor
    logger.info(`Calculando umbral de ola de calor basado en el período ${REFERENCE_START_YEAR}-${REFERENCE_END_YEAR}...`);
    const referenceRecords = allRecords.filter(r => {
        const year = getYear(r.date);
        return year >= REFERENCE_START_YEAR && year <= REFERENCE_END_YEAR;
    });
    const tmaxValues = referenceRecords.map(r => r.tmax).filter(t => t !== null);
    const heatwaveThreshold = getPercentile(tmaxValues, PERCENTILE);
    logger.info(`  - Umbral de Tmax (percentil ${PERCENTILE * 100}): ${heatwaveThreshold.toFixed(2)}°C`);

    // 2. Identificar todas las olas de calor en el conjunto de datos
    const allHeatwaves = [];
    let currentStreak = [];
    for (const record of allRecords) {
        if (record.tmax > heatwaveThreshold) {
            currentStreak.push(record);
        } else {
            if (currentStreak.length >= HEATWAVE_MIN_DAYS) {
                allHeatwaves.push(currentStreak);
            }
            currentStreak = [];
        }
    }
    if (currentStreak.length >= HEATWAVE_MIN_DAYS) {
        allHeatwaves.push(currentStreak);
    }
    logger.info(`  - Se han identificado ${allHeatwaves.length} olas de calor en total.`);

    // Crear un Set con todas las fechas de olas de calor para búsqueda rápida
    const heatwaveDates = new Set(
        allHeatwaves.flat().map(record => format(record.date, 'yyyy-MM-dd'))
    );

    // 3. Agrupar olas de calor por año
    const heatwavesByYear = _.groupBy(allHeatwaves, wave => getYear(wave[0].date));

    // 4. Generar datos para la visualización
    const recordsByDayStr = _.keyBy(allRecords, r => format(r.date, 'yyyy-MM-dd'));
    const visualizationData = [];

    logger.info(`Generando datos anuales enriquecidos desde ${START_YEAR} a ${END_YEAR}...`);

    for (let year = START_YEAR; year <= END_YEAR; year++) {
      const yearStartDate = startOfYear(new Date(year, 0, 1));
      const yearEndDate = endOfYear(new Date(year, 0, 1));
      const allDaysOfYear = eachDayOfInterval({ start: yearStartDate, end: yearEndDate });

      // Métricas del año
      const yearWaves = heatwavesByYear[year] || [];
      const heatwaveCount = yearWaves.length;
      const heatwaveTotalDays = _.sumBy(yearWaves, 'length');
      const totalTmaxInWaves = _.sumBy(yearWaves, wave => _.sumBy(wave, 'tmax'));
      const heatwaveAvgIntensity = heatwaveTotalDays > 0 ? totalTmaxInWaves / heatwaveTotalDays : 0;
      let daysOver40 = 0;

      const yearDaysData = allDaysOfYear.map(day => {
        const dayString = format(day, 'yyyy-MM-dd');
        const record = recordsByDayStr[dayString];
        const tmax = record && typeof record.tmax === 'number' ? record.tmax : null;
        if (tmax > 40) {
            daysOver40++;
        }
        return {
            date: dayString,
            tmax,
            isHeatwaveDay: heatwaveDates.has(dayString) // Añadir la nueva bandera
        };
      });

      visualizationData.push({
        year: year,
        annotation: ANOTACIONES[year] || null,
        days: yearDaysData,
        heatwaveCount,
        heatwaveTotalDays,
        heatwaveAvgIntensity: parseFloat(heatwaveAvgIntensity.toFixed(2)),
        daysOver40
      });
    }

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    logger.info(`Escribiendo datos enriquecidos en ${OUTPUT_FILE}...`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(visualizationData, null, 2));

    logger.succeed('Proceso completado con éxito.');

  } catch (error) {
    logger.failAndStop('Error durante la generación de datos:');
    console.error(error);
    process.exit(1);
  }
}

generateClimateStripesData();
