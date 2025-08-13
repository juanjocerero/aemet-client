import { format } from 'date-fns';
import fs from 'fs/promises';
import path from 'path';
import { API_CONFIG, SCRIPT_SETTINGS } from './config.js';
import { generarRangosDePeticion, formatDisplayDateRange } from './utils/dateUtils.js';
import { normalizarDatos, deduplicarPorFecha } from './utils/dataProcessor.js';
import { analizarDatosMensuales, analizarDatosAnuales } from './utils/dataAnalyzer.js';
import { obtenerDatosParaRango } from './services/aemetApi.js';
import {
  guardarDatosDiariosEnCSV,
  guardarAnalisisMensualEnCSV,
  guardarAnalisisAnualEnCSV
} from './services/csvWriter.js';
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
export async function procesarEstacion(estacionId, apiKey, fechaInicio, fechaFin) {
  // Imprime el banner inicial usando el logger de texto plano
  logger.log(`\n${logger.magentaBold('====================================================')}`);
  logger.log(`  🚀 Iniciando proceso para la estación: ${logger.highlight(estacionId)} 🚀`);
  logger.log(`${logger.magentaBold('====================================================')}`);
  
  let todosLosDatos = [];
  const errores = [];
  const rangos = generarRangosDePeticion(fechaInicio, fechaFin);
  
  // Inicia el spinner para la tarea de descarga de datos
  logger.start(`[1/${rangos.length}] Obteniendo datos para la estaci├│n ${estacionId}...`);
  
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
        todosLosDatos.push(...normalizarDatos(datosBrutos));
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
  
  // Limpiamos cualquier error residual antes de finalizar.
  logger.setError(null);
  logger.succeed(`Se han completado todas las peticiones para ${estacionId}.`);
  
  if (todosLosDatos.length > 0) {
    const datosFinales = deduplicarPorFecha(todosLosDatos);
    logger.info(`Se han obtenido ${logger.highlight(datosFinales.length)} registros únicos.`);
    
    const fInicioFmt = format(fechaInicio, 'yyyyMMdd');
    const fFinFmt = format(fechaFin, 'yyyyMMdd');
    const nombreDirectorio = `datos_${estacionId}_${fInicioFmt}_${fFinFmt}`;
    
    await fs.mkdir(nombreDirectorio, { recursive: true });
    
    // Define las tareas de guardado de ficheros
    const ficheros = [
      {
        nombre: `${estacionId}_${fInicioFmt}_${fFinFmt}.csv`,
        proceso: () => guardarDatosDiariosEnCSV(datosFinales, path.join(nombreDirectorio, ficheros[0].nombre)),
        label: 'datos diarios'
      },
      {
        nombre: `mensuales_${estacionId}_${fInicioFmt}_${fFinFmt}.csv`,
        proceso: () => guardarAnalisisMensualEnCSV(analizarDatosMensuales(datosFinales), path.join(nombreDirectorio, ficheros[1].nombre)),
        label: 'análisis mensual'
      },
      {
        nombre: `anuales_${estacionId}_${fInicioFmt}_${fFinFmt}.csv`,
        proceso: () => guardarAnalisisAnualEnCSV(analizarDatosAnuales(datosFinales), path.join(nombreDirectorio, ficheros[2].nombre)),
        label: 'análisis anual'
      }
    ];
    
    // Ejecuta cada tarea de guardado con su propio spinner
    for (const fichero of ficheros) {
      logger.start(`Generando fichero de ${fichero.label}...`);
      await fichero.proceso();
      logger.succeed(`Fichero ${logger.highlight(fichero.nombre)} guardado en ${logger.highlight(nombreDirectorio)}.`);
    }
    
  } else {
    logger.warn(`La operación para ${estacionId} finalizó sin obtener datos.`);
  }
  
  if (errores.length > 0) {
    logger.fail('Se produjeron errores durante la descarga. Revisa el log si estás en modo verbose.');
  }
}