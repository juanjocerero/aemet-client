import fs from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';
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

export async function procesarEstacion(estacionId, apiKey, fechaInicio, fechaFin) {
  logger.info(`\n${logger.magentaBold('================================================')}`);
  logger.info(`  🚀 Iniciando proceso para la estación: ${estacionId} 🚀`);
  logger.info(`${logger.magentaBold('=================================================')}`);
  
  const rangos = generarRangosDePeticion(fechaInicio, fechaFin);
  let todosLosDatos = [];
  const errores = [];
  
  // ... (el bucle for para obtener datos no cambia)
  for (let i = 0; i < rangos.length; i++) {
    const rango = rangos[i];
    const fechaIniStr = format(rango.start, "yyyy-MM-dd'T'HH:mm:ss'UTC'");
    const fechaFinStr = format(rango.end, "yyyy-MM-dd'T'HH:mm:ss'UTC'");
    
    logger.logProgress(i + 1, rangos.length, estacionId, formatDisplayDateRange(rango.start, rango.end));
    
    try {
      const datosBrutos = await obtenerDatosParaRango(fechaIniStr, fechaFinStr, estacionId, apiKey);
      if (datosBrutos?.length > 0) {
        const datosNormalizados = normalizarDatos(datosBrutos);
        todosLosDatos.push(...datosNormalizados);
        logger.success(`   ✅ Éxito. Obtenidos ${datosNormalizados.length} registros.`);
      } else {
        logger.warn(`   🟡 No se encontraron datos para este rango.`);
      }
    } catch (error) {
      logger.error(`   ❌ ERROR: No se pudieron obtener los datos.`);

      // Muestra el error completo si está en modo verbose.
      if (SCRIPT_SETTINGS.VERBOSE_MODE) {
        console.error('Detalles del error:', error);
      }
      // Almacenamos el mensaje de error simple o el objeto completo para el resumen final
      const errorToStore = SCRIPT_SETTINGS.VERBOSE_MODE ? error : { message: error.message };

      errores.push({ estacionId, rango: formatDisplayDateRange(rango.start, rango.end), error: errorToStore });
    }
    
    if (i < rangos.length - 1) await sleep(API_CONFIG.REQUEST_INTERVAL_MS);
  }
  
  
  // --- Resumen, Guardado y Análisis ---
  logger.info(`\n--- Resumen para la estación ${estacionId} ---`);
  if (todosLosDatos.length > 0) {
    const datosFinales = deduplicarPorFecha(todosLosDatos);
    logger.info(`Se han obtenido ${datosFinales.length} registros únicos.`);
    
    const fInicioFmt = format(fechaInicio, 'yyyyMMdd');
    const fFinFmt = format(fechaFin, 'yyyyMMdd');
    
    // --- Lógica de guardado en carpetas ---
    // 1. Crear el nombre del directorio de salida.
    const nombreDirectorio = `datos_${estacionId}_${fInicioFmt}_${fFinFmt}`;
    
    // 2. Crear el directorio. { recursive: true } evita errores si ya existe.
    await fs.mkdir(nombreDirectorio, { recursive: true });
    logger.info(`\nLos resultados se guardarán en la carpeta: ${logger.highlight(nombreDirectorio)}`);
    
    // 3. Guardar CSV diario dentro de la nueva carpeta.
    const nombreFicheroDiario = path.join(nombreDirectorio, `diarios_${estacionId}_${fInicioFmt}_${fFinFmt}.csv`);
    await guardarDatosDiariosEnCSV(datosFinales, nombreFicheroDiario);
    
    // 4. Realizar y guardar análisis mensual.
    logger.info(`\nIniciando análisis de datos mensuales...`);
    const datosMensuales = analizarDatosMensuales(datosFinales);
    const nombreFicheroMensual = path.join(nombreDirectorio, `mensuales_${estacionId}_${fInicioFmt}_${fFinFmt}.csv`);
    await guardarAnalisisMensualEnCSV(datosMensuales, nombreFicheroMensual);
    
    // 5. Realizar y guardar análisis anual.
    logger.info(`\nIniciando análisis de datos anuales...`);
    const datosAnuales = analizarDatosAnuales(datosFinales);
    const nombreFicheroAnual = path.join(nombreDirectorio, `anuales_${estacionId}_${fInicioFmt}_${fFinFmt}.csv`);
    await guardarAnalisisAnualEnCSV(datosAnuales, nombreFicheroAnual);
  } else {
    logger.warn(`⚠️ La operación para ${estacionId} finalizó sin obtener datos.`);
  }
  
  if (errores.length > 0) {
    logger.error(`\n--- Log de Errores para ${estacionId} ---`);
    console.dir(errores, { depth: null });
  }
  
}