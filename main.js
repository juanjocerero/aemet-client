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
  // Imprime el banner inicial usando el logger de texto plano
  logger.log(`\n${logger.magentaBold('====================================================')}`);
  logger.log(`  🚀 Iniciando proceso para la estación: ${logger.highlight(estacionId)} 🚀`);
  logger.log(`${logger.magentaBold('====================================================')}`);
  
  const errores = [];
  const rangos = generarRangosDePeticion(fechaInicio, fechaFin);
  
  const fInicioFmt = format(fechaInicio, 'yyyyMMdd');
  const fFinFmt = format(fechaFin, 'yyyyMMdd');
  const nombreDirectorio = `datos_${estacionId}_${fInicioFmt}_${fFinFmt}`;
  await fs.mkdir(nombreDirectorio, { recursive: true });
  
  // Inicializamos los analizadores y el stream de escritura
  logger.start('Inicializando procesos...');
  const nombreFicheroDiario = path.join(nombreDirectorio, `diarios_${estacionId}_${fInicioFmt}_${fFinFmt}.csv`);
  const streamDiario = crearStreamCSVDiario(nombreFicheroDiario);
  
  const analizadorMensual = crearAnalizadorMensual();
  const analizadorAnual = crearAnalizadorAnual();
  const seenDates = new Set(); // Para deduplicar sobre la marcha
  let recordCount = 0;
  logger.succeed('Procesos inicializados.');
  
  // Inicia el spinner para la tarea de descarga de datos
  logger.start(`[1/${rangos.length}] Obteniendo datos para la estación ${estacionId}...`);
  
  for (let i = 0; i < rangos.length; i++) {
    const rango = rangos[i];
    const rangoDisplay = formatDisplayDateRange(rango.start, rango.end);
    
    // Actualiza el texto del spinner en cada iteración
    logger.setError(null); 
    logger.setText(`[${i + 1}/${rangos.length}] Procesando rango ${logger.highlight(rangoDisplay)}`);
    
    try {
      const fechaIniStr = format(rango.start, "yyyy-MM-dd'T'HH:mm:ss'UTC'");
      const fechaFinStr = format(rango.end, "yyyy-MM-dd'T'HH:mm:ss'UTC'");
      const datosBrutos = await obtenerDatosParaRango(fechaIniStr, fechaFinStr, estacionId);
      
      if (datosBrutos?.length > 0) {
        const datosNormalizados = normalizarDatos(datosBrutos);
        
        for (const registro of datosNormalizados) {
          const timestamp = registro.date.getTime();
          if (!seenDates.has(timestamp)) {
            // Escribimos en el stream de datos diarios
            streamDiario.write(registro);
            // Procesamos con los analizadores incrementales
            analizadorMensual.processRecord(registro);
            analizadorAnual.processRecord(registro);
            
            seenDates.add(timestamp);
            recordCount++;
          }
        }
      }
    } catch (error) {
      // Esto mostrará el error al lado del spinner sin detenerlo.
      logger.setError(`Error en rango ${rangoDisplay}. Revisa logs.`);
      
      if (SCRIPT_SETTINGS.VERBOSE_MODE) {
        console.error('Detalles del error:', error);
      }
      
      errores.push({ estacionId, rango: rangoDisplay, error });
    }
    
    if (i < rangos.length - 1) await sleep(API_CONFIG.REQUEST_INTERVAL_MS);
  }
  
  logger.setText('Finalizando escrituras y análisis...');
  
  // Cerramos el stream del fichero diario
  const promiseCierreDiario = new Promise(resolve => streamDiario.on('finish', resolve));
  streamDiario.end();
  
  await promiseCierreDiario;
  logger.succeed(`Fichero ${logger.highlight(path.basename(nombreFicheroDiario))} guardado. Se procesaron ${logger.highlight(recordCount)} registros.`);
  
  if (recordCount > 0) {
    
    // Configuración común para los ficheros de análisis
    const columnasAnalisis = [
      'fecha', 'avg_tmed', 'avg_tmax', 'avg_tmin', 'avg_prec', 'avg_velmedia',
      'max_tmed', 'd_max_tmed', 'max_tmax', 'd_max_tmax', 'max_tmin', 'd_max_tmin',
      'max_prec', 'd_max_prec', 'max_racha', 'd_max_racha', 'max_velmedia', 'd_max_velmedia',
      'min_tmed', 'd_min_tmed', 'min_tmax', 'd_min_tmax', 'min_tmin', 'd_min_tmin',
    ];
    const castAnalisis = {
      number: (value) => (typeof value === 'number' ? value.toString().replace('.', ',') : value),
    };
    
    // Obtenemos y guardamos los resultados de los análisis
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
    logger.fail('Se produjeron errores durante la descarga. Revisa el log si estás en modo verbose.');
  }
  
  if (errores.length > 0) {
    logger.fail('Se produjeron errores durante la descarga. Revisa el log si estás en modo verbose.');
  }
}
