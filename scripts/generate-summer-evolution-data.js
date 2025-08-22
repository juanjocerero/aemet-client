/**
 * scripts/generatesummerevolutiondata.js
 *
 * Lee los datos climáticos diarios desde un CSV usando una librería de parseo robusta,
 * filtra los días de verano (21 de junio - 21 de septiembre), calcula métricas clave
 * y exporta los resultados a un archivo JSON optimizado para la visualización.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { parse as parseDate, getYear, getDayOfYear, isWithinInterval, startOfDay, isValid } from 'date-fns';
import _ from 'lodash-es';

// --- CONFIGURACIÓN ---
const CSV_INPUT_PATH = path.resolve(process.cwd(), 'datos_5530E_19720101_20250819', 'diarios_5530E_19720101_20250819.csv');
const JSON_OUTPUT_PATH = path.resolve(process.cwd(), 'visualizacion', 'summerevolution.json');
const START_YEAR = 1972;
const END_YEAR = 2025;

// --- FUNCIONES AUXILIARES ---

/**
 * Lee y parsea un fichero CSV, devolviendo todos los registros.
 * @param {string} filePath - La ruta al fichero CSV.
 * @returns {Promise<Array<Object>>} Una promesa que resuelve a un array de registros.
 */
function loadAndParseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];
    createReadStream(filePath)
      .pipe(parse({
        columns: true,
        delimiter: ',',
        trim: true,
        cast: (value, context) => {
          if (context.column === 'tmax') {
            if (typeof value !== 'string' || value.trim() === '') return null;
            const num = parseFloat(value.replace(',', '.'));
            return isNaN(num) ? null : num;
          }
          return value;
        }
      }))
      .on('error', (error) => reject(error))
      .on('data', (row) => {
        const date = parseDate(row.fecha, 'yyyy-MM-dd', new Date());
        if (isValid(date)) {
          records.push({ date, tmax: row.tmax });
        }
      })
      .on('end', () => resolve(records));
  });
}

/**
 * Filtra los registros para incluir solo los del verano astronómico.
 * @param {Array<Object>} allRecords - Todos los registros parseados.
 * @returns {Array<Object>} Registros que caen entre el 21 de junio y el 22 de septiembre.
 */
const filterSummerRecords = (allRecords) => {
  return allRecords.filter(record => {
    const year = getYear(record.date);
    const summerStart = startOfDay(new Date(year, 5, 21)); // 21 de Junio
    const summerEnd = startOfDay(new Date(year, 8, 23));   // 23 de Septiembre (no inclusivo)
    return isWithinInterval(record.date, { start: summerStart, end: summerEnd });
  });
};

// --- LÓGICA PRINCIPAL ---

async function processData() {
  console.log('🔵 Iniciando el procesamiento de datos climáticos...');
  try {
    // 1. Cargar y parsear el CSV de forma robusta
    console.log(`📂 Cargando datos desde: ${path.basename(CSV_INPUT_PATH)}`);
    const allRecords = await loadAndParseCsv(CSV_INPUT_PATH);

    // 2. Filtrar por período de verano
    const summerRecords = filterSummerRecords(allRecords);
    console.log(`☀️ Se encontraron ${summerRecords.length} registros de días de verano.`);

    if (summerRecords.length === 0) {
      throw new Error('No se encontraron datos de verano. Revisa el CSV y las fechas.');
    }

    // 3. Cálculos globales
    const allValidTmax = summerRecords.map(r => r.tmax).filter(t => t !== null);
    const periodMeanTmax = _.mean(allValidTmax);
    const bounds = {
      min: _.min(allValidTmax),
      max: _.max(allValidTmax)
    };
    console.log(`📈 Media histórica de Tmax en verano: ${periodMeanTmax.toFixed(2)}°C`);
    console.log(`🌡️ Rango de Tmax: de ${bounds.min.toFixed(2)}°C a ${bounds.max.toFixed(2)}°C`);

    // 4. Calcular la media histórica para cada día del verano
    const summerRecordsWithDayIndex = summerRecords.map(record => {
      const year = getYear(record.date);
      const firstDayOfYear = getDayOfYear(new Date(year, 5, 21));
      return {
        ...record,
        summerDay: getDayOfYear(record.date) - firstDayOfYear
      };
    });

    const summerDaysGrouped = _.groupBy(summerRecordsWithDayIndex, 'summerDay');
    const historicalDailyAverage = Object.entries(summerDaysGrouped).map(([day, records]) => {
      const validTmax = records.map(r => r.tmax).filter(t => t !== null);
      return {
        day: parseInt(day, 10),
        avgTmax: validTmax.length > 0 ? _.mean(validTmax) : null
      };
    }).sort((a, b) => a.day - b.day);
    
    console.log(`📅 Calculada la media histórica para ${historicalDailyAverage.length} días del verano.`);

    // 5. Agrupar por año y calcular métricas anuales
    const summerByYear = _.groupBy(summerRecords, record => getYear(record.date));
    const yearlyData = [];

    for (let year = START_YEAR; year <= END_YEAR; year++) {
      const yearStr = String(year);
      const yearRecords = summerByYear[yearStr] || [];
      
      const validYearTmax = yearRecords.map(r => r.tmax).filter(t => t !== null);
      const meanTmax = validYearTmax.length > 0 ? _.mean(validYearTmax) : null;
      const deviation = meanTmax !== null ? meanTmax - periodMeanTmax : null;

      const firstDayOfYear = getDayOfYear(new Date(year, 5, 21));

      yearlyData.push({
        year: year,
        meanTmax: meanTmax,
        deviation: deviation,
        dailyPoints: yearRecords.map(r => ({
          day: getDayOfYear(r.date) - firstDayOfYear, // Índice desde 0
          tmax: r.tmax
        }))
      });
    }
    
    console.log(`📊 Datos procesados para ${yearlyData.length} años.`);

    // 6. Construir el objeto final y guardar como JSON
    const outputData = {
      periodMeanTmax,
      bounds,
      historicalDailyAverage,
      yearlyData
    };

    await fs.writeFile(JSON_OUTPUT_PATH, JSON.stringify(outputData, null, 2));
    console.log(`✅ Éxito. Datos guardados en: ${path.basename(JSON_OUTPUT_PATH)}`);

  } catch (error) {
    console.error('❌ Error durante el procesamiento de datos:', error);
    process.exit(1);
  }
}

processData();