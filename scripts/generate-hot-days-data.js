/**
 * scripts/generate-hot-days-data.js
 *
 * Responsabilidad: Generar el conjunto de datos para la visualización
 * de la "cuadrícula de fuego", que muestra los días de verano que
 * superaron la temperatura media del período histórico.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import _ from 'lodash-es';
import { getYear, startOfDay, isWithinInterval, eachDayOfInterval, format } from 'date-fns';
import { readData, normalizarDatos } from '../src/utils/dataProcessor.js';
import { logger } from '../src/utils/consoleLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '..', 'datos_5530E_19720101_20250819', 'diarios_5530E_19720101_20250819.csv');
const OUTPUT_DIR = path.join(__dirname, '..', 'visualizacion');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'hot-days.json');

const START_YEAR = 1972;
const END_YEAR = 2025;

// --- Funciones de Análisis (adaptadas de summerAnalysis.js) ---

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
    if (!record.date) return false;
    const month = record.date.getMonth();
    const day = record.date.getDate();
    // Verano astronómico: 21 de junio a 21 de septiembre
    if (month === 5 && day >= 21) return true; // Junio
    if (month === 6 || month === 7) return true; // Julio y Agosto
    if (month === 8 && day <= 21) return true; // Septiembre
    return false;
  });
};


// --- Función Principal ---

async function generateHotDaysData() {
  try {
    logger.info(`Leyendo datos de ${path.basename(DATA_FILE)}...`);
    const rawData = readData(DATA_FILE);
    logger.info(`  - ${rawData.length} registros leídos.`);

    logger.info('Normalizando datos...');
    const allRecords = normalizarDatos(rawData);
    logger.info(`  - ${allRecords.length} registros normalizados.`);

    logger.info('Filtrando registros de verano (21 Jun - 21 Sep) para todo el período...');
    const summerRecords = filterSummerRecords(allRecords);
    logger.info(`  - ${summerRecords.length} días de verano encontrados.`);

    logger.info('Calculando la temperatura media ("tmed") para todo el período de verano...');
    const avgPeriodoTmed = robustMean(summerRecords, 'tmed');
    logger.info(`  - Media histórica de tmed: ${avgPeriodoTmed.toFixed(2)}°C`);

    const visualizationData = [];
    const recordsByDay = _.keyBy(allRecords, r => format(r.date, 'yyyy-MM-dd'));

    logger.info(`Generando datos para los años ${START_YEAR} a ${END_YEAR}...`);
    for (let year = START_YEAR; year <= END_YEAR; year++) {
      const summerStart = startOfDay(new Date(year, 5, 21)); // 21 de Junio
      const summerEnd = startOfDay(new Date(year, 8, 21));   // 21 de Septiembre
      
      const summerDays = eachDayOfInterval({ start: summerStart, end: summerEnd });
      
      const yearData = {
        año: year,
        dias: summerDays.map(day => {
          const dayString = format(day, 'yyyy-MM-dd');
          const record = recordsByDay[dayString];
          // Si no hay registro o tmed no es un número, se considera false.
          if (!record || typeof record.tmed !== 'number') {
            return false;
          }
          return record.tmed > avgPeriodoTmed;
        })
      };
      
      // Asegurarnos de que siempre haya 92 días
      if (yearData.dias.length !== 92) {
         // Esto puede pasar en años bisiestos si el intervalo es inclusivo y se cuenta mal.
         // eachDayOfInterval es inclusivo. 21/6 al 21/9 son 93 días. Ajustamos.
         const summerEndCorrected = startOfDay(new Date(year, 8, 20));
         const summerDaysCorrected = eachDayOfInterval({ start: summerStart, end: summerEndCorrected });
         yearData.dias = summerDaysCorrected.map(day => {
             const dayString = format(day, 'yyyy-MM-dd');
             const record = recordsByDay[dayString];
             if (!record || typeof record.tmed !== 'number') return false;
             return record.tmed > avgPeriodoTmed;
         });

         // Si aún así no son 92, es un caso raro, lo forzamos.
         while(yearData.dias.length < 92) yearData.dias.push(false);
         while(yearData.dias.length > 92) yearData.dias.pop();
      }

      visualizationData.push(yearData);
    }

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR);
    }

    logger.info(`Escribiendo datos en ${OUTPUT_FILE}...`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(visualizationData, null, 2));

    logger.succeed('Proceso completado con éxito.');

  } catch (error) {
    logger.failAndStop('Error durante la generación de datos:');
    console.error(error);
    process.exit(1);
  }
}

generateHotDaysData();
