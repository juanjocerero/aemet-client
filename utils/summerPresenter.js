/**
 * utils/summerPresenter.js
 * 
 * Responsabilidad: Tomar el objeto de resultados del análisis y encargarse
 * de toda la presentación: mostrar tablas en consola y escribir ficheros CSV.
 */
import fs from 'fs';
import path from 'path';
import { stringify } from 'csv-stringify/sync';
import { createFormattedTable } from './consoleColorizer.js';

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
};

/**
 * Orquesta toda la salida de resultados (consola y ficheros).
 * @param {Object} results - El objeto completo con todos los datos analizados.
 * @param {string} stationId - El ID de la estación para nombrar los ficheros.
 */
export function presentSummerResults(results, stationId) {
  const analysisDir = path.join(process.cwd(), 'analisis');
  if (!fs.existsSync(analysisDir)) {
    fs.mkdirSync(analysisDir);
  }

  // --- Presentación de Promedios del Período ---
  console.log('\n--- 📊 Promedios del Período Completo ---');
  console.table(results.promediosPeriodo);
  writeCsv(path.join(analysisDir, `promedios_periodo_${stationId}.csv`), results.promediosPeriodo);

  // --- Presentación de Análisis Anual ---
  console.log('\n--- 📈 Desviación Anual vs. Media del Período ---');
  console.log(createFormattedTable(results.analisisAnual.desviaciones,
    { desv_tmed: { type: 'deviation' }, desv_tmax: { type: 'deviation' }, desv_tmin: { type: 'deviation' } },
    { center: true }
  ));
  writeCsv(path.join(analysisDir, `desviaciones_${stationId}.csv`), results.analisisAnual.desviaciones);

  console.log('\n--- 🔥 Días por Año que Superan la Media del Período ---');
  console.log(createFormattedTable(results.analisisAnual.diasSuperados,
    { dias_tmed_superada: { type: 'gradient', decimals: 0 }, dias_tmax_superada: { type: 'gradient', decimals: 0 }, dias_tmin_superada: { type: 'gradient', decimals: 0 } },
    { center: true }
  ));
  writeCsv(path.join(analysisDir, `dias_superados_${stationId}.csv`), results.analisisAnual.diasSuperados);

  // --- Presentación de Análisis por Décadas ---
  if (results.analisisDecadas.desviaciones.length > 0) {
    console.log('\n--- 📈 Desviación Media por Década vs. Media del Período ---');
    console.log(createFormattedTable(results.analisisDecadas.desviaciones,
      { desv_tmed_promedio: { type: 'deviation' }, desv_tmax_promedio: { type: 'deviation' }, desv_tmin_promedio: { type: 'deviation' } },
      { center: true }
    ));
    writeCsv(path.join(analysisDir, `decadas_desviaciones_${stationId}.csv`), results.analisisDecadas.desviaciones);
  }

  if (results.analisisDecadas.diasSuperados.length > 0) {
    console.log('\n--- 🔥 Promedio de Días/Año Superando la Media (por Década) ---');
    console.log(createFormattedTable(results.analisisDecadas.diasSuperados,
      { dias_tmed_superada_promedio: { type: 'gradient', decimals: 0 }, dias_tmax_superada_promedio: { type: 'gradient', decimals: 0 }, dias_tmin_superada_promedio: { type: 'gradient', decimals: 0 } },
      { center: true }
    ));
    writeCsv(path.join(analysisDir, `decadas_dias_superados_${stationId}.csv`), results.analisisDecadas.diasSuperados);
  }

  // --- Guardado del fichero de promedios anuales original ---
  writeCsv(path.join(analysisDir, `datos_verano_${stationId}.csv`), results.analisisAnual.promedios);

  console.log('\n🎉 Análisis de verano completado.');
}
