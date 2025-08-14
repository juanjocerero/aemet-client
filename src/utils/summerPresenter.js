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
 */
const writeCsv = (filePath, data) => {
  if (!data || data.length === 0) return; // No escribir ficheros vacíos
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
  const analysisDir = path.join(process.cwd(), `analisis_${stationId}`);
  if (!fs.existsSync(analysisDir)) {
    fs.mkdirSync(analysisDir);
  }

  // --- Promedios del Período ---
  console.log('\n--- 📊 Promedios del Período Completo ---');
  console.table(results.promediosPeriodo);
  writeCsv(path.join(analysisDir, `promedios_periodo_${stationId}.csv`), results.promediosPeriodo);

  // --- Análisis Anual ---
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

  console.log('\n--- 🌡️ Noches Tropicales (>20°C) y Días de Horno (>40°C) por Año ---');
  console.log(createFormattedTable(results.analisisAnual.umbrales,
    { noches_tropicales: { type: 'gradient', decimals: 0 }, "dias_de_horno_40c": { type: 'gradient', decimals: 0 } },
    { center: true }
  ));
  writeCsv(path.join(analysisDir, `noches_tropicales_${stationId}.csv`), results.analisisAnual.umbrales.map(r => ({ año: r.año, noches_tropicales: r.noches_tropicales })));
  writeCsv(path.join(analysisDir, `calor_extremo_${stationId}.csv`), results.analisisAnual.umbrales.map(r => ({ año: r.año, dias_de_horno_40c: r.dias_de_horno_40c })));

  console.log('\n--- ☀️ Duración del Verano Meteorológico por Año ---');
  console.log(createFormattedTable(results.analisisAnual.duracionVerano,
    { duracion_verano_dias: { type: 'gradient', decimals: 0 } },
    { center: true }
  ));
  writeCsv(path.join(analysisDir, `duracion_verano_${stationId}.csv`), results.analisisAnual.duracionVerano);

  console.log('\n--- 🥵 Anatomía de las Olas de Calor por Año ---');
  console.log(createFormattedTable(results.analisisAnual.olasDeCalor,
    { frecuencia: { type: 'gradient', decimals: 0 }, duracion_media_dias: { type: 'gradient', decimals: 0 }, intensidad_media_tmax: { type: 'gradient', decimals: 1 } },
    { center: true }
  ));
  writeCsv(path.join(analysisDir, `olas_calor_${stationId}.csv`), results.analisisAnual.olasDeCalor);

  // --- Análisis por Décadas ---
  console.log('\n--- 📈 Desviación Media por Década vs. Media del Período ---');
  console.log(createFormattedTable(results.analisisDecadas.desviaciones,
    { desv_tmed_promedio: { type: 'deviation' }, desv_tmax_promedio: { type: 'deviation' }, desv_tmin_promedio: { type: 'deviation' } },
    { center: true }
  ));
  writeCsv(path.join(analysisDir, `decadas_desviaciones_${stationId}.csv`), results.analisisDecadas.desviaciones);

  console.log('\n--- 🔥 Promedio de Días/Año Superando la Media (por Década) ---');
  console.log(createFormattedTable(results.analisisDecadas.diasSuperados,
    { dias_tmed_superada_promedio: { type: 'gradient', decimals: 1 }, dias_tmax_superada_promedio: { type: 'gradient', decimals: 1 }, dias_tmin_superada_promedio: { type: 'gradient', decimals: 1 } },
    { center: true }
  ));
  writeCsv(path.join(analysisDir, `decadas_dias_superados_${stationId}_promedio.csv`), results.analisisDecadas.diasSuperados);

  console.log('\n--- 🔥 Total de Días/Año Superando la Media (por Década) ---');
  console.log(createFormattedTable(results.analisisDecadas.diasSuperadosTotales,
    { dias_tmed_superada_total: { type: 'gradient', decimals: 0 }, dias_tmax_superada_total: { type: 'gradient', decimals: 0 }, dias_tmin_superada_total: { type: 'gradient', decimals: 0 } },
    { center: true }
  ));
  writeCsv(path.join(analysisDir, `decadas_dias_superados_${stationId}_total.csv`), results.analisisDecadas.diasSuperadosTotales);

  console.log('\n--- 🌡️ Promedio de Noches Tropicales y Días de Horno (por Década) ---');
  console.log(createFormattedTable(results.analisisDecadas.umbrales,
    { noches_tropicales_promedio: { type: 'gradient', decimals: 1 }, dias_de_horno_40c_promedio: { type: 'gradient', decimals: 1 } },
    { center: true }
  ));
  writeCsv(path.join(analysisDir, `decadas_noches_tropicales_${stationId}.csv`), results.analisisDecadas.umbrales.map(r => ({ decada: r.decada, noches_tropicales_promedio: r.noches_tropicales_promedio })));
  writeCsv(path.join(analysisDir, `decadas_calor_extremo_${stationId}.csv`), results.analisisDecadas.umbrales.map(r => ({ decada: r.decada, dias_de_horno_40c_promedio: r.dias_de_horno_40c_promedio })));

  console.log('\n--- ☀️ Duración Media del Verano Meteorológico (por Década) ---');
  console.log(createFormattedTable(results.analisisDecadas.duracionVerano,
    { duracion_media_dias: { type: 'gradient', decimals: 0 } },
    { center: true }
  ));
  writeCsv(path.join(analysisDir, `decadas_duracion_verano_${stationId}.csv`), results.analisisDecadas.duracionVerano);

  console.log('\n--- 🥵 Anatomía de las Olas de Calor (Promedio por Década) ---');
  console.log(createFormattedTable(results.analisisDecadas.olasDeCalor,
    { frecuencia_total: { type: 'gradient', decimals: 0 }, frecuencia_promedio_anual: { type: 'gradient', decimals: 1 }, duracion_media_dias: { type: 'gradient', decimals: 1 }, intensidad_media_tmax: { type: 'gradient', decimals: 1 } },
    { center: true }
  ));
  writeCsv(path.join(analysisDir, `decadas_olas_calor_${stationId}.csv`), results.analisisDecadas.olasDeCalor);

  // --- Guardado del fichero de promedios anuales original ---
  writeCsv(path.join(analysisDir, `datos_verano_${stationId}.csv`), results.analisisAnual.promedios);

  console.log('\n🎉 Análisis de verano completado.');
}