// summer.js
// Importación de las librerías con sintaxis de ES Modules
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';
import { parseISO, getYear, startOfDay, isWithinInterval } from 'date-fns';
import _ from 'lodash-es';

// --- FUNCIONES AUXILIARES ---

/**
 * Calcula la estación astronómica para una fecha dada en el hemisferio norte.
 * @param {Date} date - El objeto de fecha de date-fns.
 * @returns {string} El nombre de la estación.
 */
const getAstronomicalSeason = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date)) {
    return 'Invalid Date';
  }
  const year = getYear(date);
  const summerStart = startOfDay(new Date(year, 5, 21)); // 21 de Junio
  const autumnStart = startOfDay(new Date(year, 8, 22)); // 22 de Septiembre
  
  return isWithinInterval(date, { start: summerStart, end: autumnStart }) ? 'Verano' : 'Otra';
};

/**
 * Calcula de forma robusta la media de una columna, ignorando valores no numéricos.
 * @param {Array<Object>} records - Los registros a promediar.
 * @param {string} column - El nombre de la columna.
 * @returns {number} La media calculada.
 */
const robustMean = (records, column) => {
  const validValues = records
    .map(r => r[column])
    .filter(v => typeof v === 'number' && !isNaN(v));
  
  if (validValues.length === 0) return 0;
  return _.mean(validValues);
};

/**
 * Escribe un array de objetos en un fichero CSV de forma síncrona.
 * @param {string} filePath - La ruta del fichero de destino.
 * @param {Array<Object>} data - Los datos a escribir.
 */
const writeCsv = (filePath, data) => {
  try {
    const output = stringify(data, { header: true });
    fs.writeFileSync(filePath, output);
    console.log(`
✅ Fichero guardado con éxito en: ${filePath}`);
  } catch (err) {
    console.error(`❌ Error al escribir el fichero CSV en ${filePath}:`, err.message);
  }
}


// --- FUNCIÓN PRINCIPAL ---

/**
 * Función principal que lee, procesa y escribe los datos del fichero CSV.
 * @param {string} filePath - La ruta al fichero CSV que se va a analizar.
 */
const analizarVerano = (filePath) => {
  if (!fs.existsSync(filePath)) {
    console.error(`
❌ Error: El fichero no existe en la ruta especificada: ${filePath}`);
    return;
  }
  
  console.log(`
🚀 Iniciando el análisis de verano para el fichero: ${filePath}`);
  const records = [];
  
  fs.createReadStream(filePath)
    .pipe(parse({
      columns: true,
      delimiter: ',',
      trim: true,
      cast: (value, context) => {
        // Convierte a número solo las columnas relevantes, manejando comas y valores vacíos.
        if (['tmed', 'tmin', 'tmax'].includes(context.column)) {
          if (value === '' || value === null) return null;
          const num = parseFloat(String(value).replace(',', '.'));
          return isNaN(num) ? null : num;
        }
        return value;
      }
    }))
    .on('error', (error) => {
      console.error(`❌ Error leyendo el CSV en '${filePath}':`, error.message);
    })
    .on('data', (row) => {
      try {
        row.fecha_js = parseISO(row.fecha);
        row.estacion = getAstronomicalSeason(row.fecha_js);
        records.push(row);
      } catch (error) {
        console.error(`❌ Error procesando la fila: ${JSON.stringify(row)}. Error: ${error.message}`);
      }
    })
    .on('end', () => {
      // 1. Filtrar solo los registros de verano
      const summerRecords = records.filter(r => r.estacion === 'Verano');
      if (summerRecords.length === 0) {
        console.log("🤷 No se encontraron datos de verano en el fichero proporcionado.");
        return;
      }
      
      const baseName = path.basename(filePath);
      const parts = baseName.split('_');
      const estacionId = parts.length > 1 ? parts[1] : 'desconocida';
      
      console.log(`
🔎 Encontrados ${summerRecords.length} registros de verano para la estación ${estacionId}.`);

      // 2. Crear directorio de análisis si no existe
      const analysisDir = path.join(process.cwd(), 'analisis');
      if (!fs.existsSync(analysisDir)) {
        fs.mkdirSync(analysisDir);
      }

      // 3. Calcular promedios del período completo (Requisito 2a)
      const avgPeriodoTmed = robustMean(summerRecords, 'tmed');
      const avgPeriodoTmax = robustMean(summerRecords, 'tmax');
      const avgPeriodoTmin = robustMean(summerRecords, 'tmin');
      
      const promediosPeriodo = [{
        'periodo': `Veranos ${getYear(summerRecords[0].fecha_js)}-${getYear(summerRecords[summerRecords.length - 1].fecha_js)}`,
        'promedio_tmed': avgPeriodoTmed.toFixed(2),
        'promedio_tmax': avgPeriodoTmax.toFixed(2),
        'promedio_tmin': avgPeriodoTmin.toFixed(2),
      }];
      
      console.log('\n--- 📊 Promedios del Período Completo ---');
      console.table(promediosPeriodo);
      writeCsv(path.join(analysisDir, `promedios_periodo_${estacionId}.csv`), promediosPeriodo);

      // 4. Agrupar por año y calcular análisis anuales
      const summerByYear = _.groupBy(summerRecords, record => getYear(record.fecha_js));
      
      const desviaciones = [];
      const diasSuperados = [];
      const promediosAnuales = []; // Para el CSV original

      for (const year in summerByYear) {
        const yearRecords = summerByYear[year];
        
        // Promedios para el año actual
        const avgYearTmed = robustMean(yearRecords, 'tmed');
        const avgYearTmax = robustMean(yearRecords, 'tmax');
        const avgYearTmin = robustMean(yearRecords, 'tmin');

        // Guardar para el CSV original
        promediosAnuales.push({
          'Año': parseInt(year),
          'Temperatura Media Verano (°C)': avgYearTmed.toFixed(2),
          'Temperatura Mínima Verano (°C)': avgYearTmin.toFixed(2),
          'Temperatura Máxima Verano (°C)': avgYearTmax.toFixed(2),
        });

        // Calcular desviaciones (Requisito 2b)
        desviaciones.push({
          'año': year,
          'desv_tmed': (avgYearTmed - avgPeriodoTmed).toFixed(2),
          'desv_tmax': (avgYearTmax - avgPeriodoTmax).toFixed(2),
          'desv_tmin': (avgYearTmin - avgPeriodoTmin).toFixed(2),
        });

        // Contar días que superan la media del período (Requisito 2c)
        diasSuperados.push({
          'año': year,
          'dias_tmed_superada': yearRecords.filter(r => r.tmed > avgPeriodoTmed).length,
          'dias_tmax_superada': yearRecords.filter(r => r.tmax > avgPeriodoTmax).length,
          'dias_tmin_superada': yearRecords.filter(r => r.tmin > avgPeriodoTmin).length,
        });
      }

      console.log('\n--- 📈 Desviación Anual vs. Media del Período ---');
      console.table(desviaciones);
      writeCsv(path.join(analysisDir, `desviaciones_${estacionId}.csv`), desviaciones);

      console.log('\n--- 🔥 Días por Año que Superan la Media del Período ---');
      console.table(diasSuperados);
      writeCsv(path.join(analysisDir, `dias_superados_${estacionId}.csv`), diasSuperados);
      
      // 5. Guardar el fichero original de promedios de verano por año
      writeCsv(path.join(process.cwd(), `datos_verano_${estacionId}.csv`), promediosAnuales);

      console.log('\n🎉 Análisis de verano completado.');
    });
};

// --- EJECUCIÓN DEL SCRIPT ---

const inputFile = process.argv[2];

if (!inputFile) {
  console.error('❌ Error: Debes proporcionar la ruta al fichero CSV como argumento.');
  console.log(`Ejemplo: node summer.js 'ruta/a/tus/datos.csv'`);
  process.exit(1);
}

analizarVerano(path.resolve(inputFile));