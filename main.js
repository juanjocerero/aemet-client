import { format } from 'date-fns';
import fs from 'fs/promises';
import path from 'path';
import { API_CONFIG, SCRIPT_SETTINGS } from './config.js';
import { generarRangosDePeticion, formatDisplayDateRange } from './utils/dateUtils.js';
import { obtenerDatosParaRango } from './services/aemetApi.js';
import { normalizarDatos } from './utils/dataProcessor.js';
import { crearStreamCSVDiario, guardarAnalisisEnCSV } from './services/csvWriter.js';
import { crearAnalizadorMensual, crearAnalizadorAnual } from './utils/dataAnalyzer.js';
import { logger } from './utils/consoleLogger.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- Código completo de la función ---

/**
* Orquesta la descarga, análisis y guardado de datos para una sola estación.
* @param {string} estacionId - Indicativo de la estación a procesar.
* @param {string} apiKey - Clave de la API.
* @param {Date} fechaInicio - Fecha de inicio del proceso.
* @param {Date} fechaFin - Fecha de fin del proceso.
*/
export async function procesarEstacion(estacionId, fechaInicio, fechaFin) {
  logger.log(`\n${logger.magentaBold('====================================================')}`);
  logger.log(` 🚀 Iniciando proceso para la estación: ${logger.highlight(estacionId)} 🚀`);
  logger.log(`${logger.magentaBold('====================================================')}`);
  
  const errores = [];
  const rangos = generarRangosDePeticion(fechaInicio, fechaFin);
  const fInicioFmt = format(fechaInicio, 'yyyyMMdd');
  const fFinFmt = format(fechaFin, 'yyyyMMdd');
  const nombreDirectorio = `datos_${estacionId}_${fInicioFmt}_${fFinFmt}`;
  await fs.mkdir(nombreDirectorio, { recursive: true });
  
  logger.start('Inicializando procesos...');
  const nombreFicheroDiario = path.join(nombreDirectorio, `diarios_${estacionId}_${fInicioFmt}_${fFinFmt}.csv`);
  const streamDiario = crearStreamCSVDiario(nombreFicheroDiario);
  const analizadorMensual = crearAnalizadorMensual();
  const analizadorAnual = crearAnalizadorAnual();
  const seenDates = new Set();
  let recordCount = 0;
  logger.succeed('Procesos inicializados.');
  
  const maxIntentos = Math.floor(API_CONFIG.MAX_RETRY_SECONDS * 1000 / API_CONFIG.RETRY_DELAY_MS);
  logger.start(`[1/${rangos.length}] Obteniendo datos para la estación ${estacionId}...`);
  
  for (let i = 0; i < rangos.length; i++) {
    const rango = rangos[i];
    const rangoDisplay = formatDisplayDateRange(rango.start, rango.end);
    let exitoRango = false;
    
    for (let intento = 0; intento < maxIntentos; intento++) {
      logger.setError(null);
      const textoIntento = intento > 0 ? ` (Reintento ${intento}/${maxIntentos - 1})` : '';
      logger.setText(`[${i + 1}/${rangos.length}] Procesando rango ${logger.highlight(rangoDisplay)}${textoIntento}`);
      
      try {
        const fechaIniStr = format(rango.start, "yyyy-MM-dd'T'HH:mm:ss'UTC'");
        const fechaFinStr = format(rango.end, "yyyy-MM-dd'T'HH:mm:ss'UTC'");
        const datosBrutos = await obtenerDatosParaRango(fechaIniStr, fechaFinStr, estacionId);
        
        if (datosBrutos?.length > 0) {
          const datosNormalizados = normalizarDatos(datosBrutos);
          for (const registro of datosNormalizados) {
            const timestamp = registro.date.getTime();
            if (!seenDates.has(timestamp)) {
              streamDiario.write(registro);
              analizadorMensual.processRecord(registro);
              analizadorAnual.processRecord(registro);
              seenDates.add(timestamp);
              recordCount++;
            }
          }
        }
        exitoRango = true;
        break; // Si tiene éxito, sal del bucle de reintentos.
      } catch (error) {
        const esUltimoIntento = intento === maxIntentos - 1;
        if (esUltimoIntento) {
          logger.setError(`Fallo definitivo en rango ${rangoDisplay}.`);
          errores.push({ estacionId, rango: rangoDisplay, error });
        } else {
          logger.setWarning(`Error en rango ${rangoDisplay}. Reintentando en ${API_CONFIG.REQUEST_INTERVAL_MS / 1000}s...`);
          await sleep(API_CONFIG.REQUEST_INTERVAL_MS);
        }
      }
    }
  }
  
  logger.setText('Finalizando escrituras y análisis...');
  const promiseCierreDiario = new Promise(resolve => streamDiario.on('finish', resolve));
  streamDiario.end();
  await promiseCierreDiario;
  logger.succeed(`Fichero ${logger.highlight(path.basename(nombreFicheroDiario))} guardado. Se procesaron ${logger.highlight(recordCount)} registros.`);
  
  if (recordCount > 0) {
    // ... (el resto del bloque de guardado de análisis no cambia)
    const columnasAnalisis = [ 'fecha', 'avg_tmed', 'avg_tmax', 'avg_tmin', 'avg_prec', 'avg_velmedia', 'max_tmed', 'd_max_tmed', 'max_tmax', 'd_max_tmax', 'max_tmin', 'd_max_tmin', 'max_prec', 'd_max_prec', 'max_racha', 'd_max_racha', 'max_velmedia', 'd_max_velmedia', 'min_tmed', 'd_min_tmed', 'min_tmax', 'd_min_tmax', 'min_tmin', 'd_min_tmin', ];
    const castAnalisis = { number: (value) => (typeof value === 'number' ? value.toString().replace('.', ',') : value), };
    const resultadosMensuales = analizadorMensual.getResults();
    const nombreFicheroMensual = path.join(nombreDirectorio, `mensuales_${estacionId}_${fInicioFmt}_${fFinFmt}.csv`);
    await guardarAnalisisEnCSV(resultadosMensuales, nombreFicheroMensual, columnasAnalisis, castAnalisis);
    const resultadosAnuales = analizadorAnual.getResults();
    const nombreFicheroAnual = path.join(nombreDirectorio, `anuales_${estacionId}_${fInicioFmt}_${fFinFmt}.csv`);
    await guardarAnalisisEnCSV(resultadosAnuales, nombreFicheroAnual, columnasAnuales, castAnalisis);
    logger.succeed('Ficheros de análisis generados.');
  } else {
    logger.warn(`La operación para ${estacionId} finalizó sin obtener datos.`);
  }
  
  if (errores.length > 0) {
    logger.failAndStop('Se produjeron errores durante la descarga. Los siguientes rangos no se pudieron procesar:');
    for (const e of errores) {
      console.log(`  - Estación: ${logger.highlight(e.estacionId)}, Rango: ${logger.highlight(e.rango)}`);
    }
  }
}
