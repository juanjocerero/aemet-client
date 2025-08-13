// services/aemetApi.js
import { API_CONFIG, SCRIPT_SETTINGS } from '../config.js';
import { logger } from '../utils/consoleLogger.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function obtenerDatosParaRango(fechaIniStr, fechaFinStr, estacionId) {

  // La clave se lee directamente de las variables de entorno
  const apiKey = process.env.AEMET_API_KEY;

  const apiUrl = `https://opendata.aemet.es/opendata/api/valores/climatologicos/diarios/datos/fechaini/${fechaIniStr}/fechafin/${fechaFinStr}/estacion/${estacionId}`;
  const maxIntentos = Math.floor(API_CONFIG.MAX_RETRY_SECONDS * 1000 / API_CONFIG.RETRY_DELAY_MS);
  
  for (let i = 0; i < maxIntentos; i++) {
    try {
      // Al empezar un nuevo intento, limpiamos cualquier mensaje de estado anterior.
      logger.setWarning(null);
      
      const resInicial = await fetch(apiUrl, {
        headers: { 'api_key': apiKey, 'Accept': 'application/json' },
      });
      
      if (resInicial.status === 429) {
        // Lanza un error específico para ser capturado por el catch de abajo
        throw new Error(`Rate limiting (429)`);
      }
      if (!resInicial.ok) {
        // Lanza un error para ser capturado por el catch de este bloque try
        throw new Error(`Error en petición inicial: ${resInicial.status} ${resInicial.statusText}`);
      }
      
      const resUrlDatos = await resInicial.json();
      if (resUrlDatos.estado !== 200) {
        // Lanza un error para ser capturado por el catch de este bloque try
        throw new Error(`Error en la respuesta de Aemet: ${resUrlDatos.descripcion}`);
      }
      
      const resDatosFinales = await fetch(resUrlDatos.datos);
      if (!resDatosFinales.ok) {
        // Lanza un error para ser capturado por el catch de este bloque try
        throw new Error(`Error al obtener datos finales: ${resDatosFinales.status} ${resDatosFinales.statusText}`);
      }
      
      // Si la petición tiene éxito, limpiamos cualquier mensaje de error anterior
      logger.setWarning(null);
      return await resDatosFinales.json();
      
    } catch (error) {
      
      const esUltimoIntento = i === maxIntentos - 1;
      const mensajeReintento = `Error en petición. Reintentando en ${API_CONFIG.RETRY_DELAY_MS / 1000}s... (Intento ${i + 1}/${maxIntentos})`;      
      
      // Usamos setWarning para mostrar el mensaje EN LA MISMA LÍNEA, sin detener el spinner.
      logger.setWarning(mensajeReintento);
      
      if (SCRIPT_SETTINGS.VERBOSE_MODE) {
        // El \n inicial asegura que el log detallado aparezca en su propia línea
        // sin ser afectado por la reescritura del spinner.
        console.error(`\n[VERBOSE] Detalles del error:`, error);
      }
      
      if (esUltimoIntento) {
        // Si es el último intento, ahora sí propagamos el error final.
        throw new Error(`La petición falló definitivamente para el rango ${fechaIniStr} - ${fechaFinStr} tras ${maxIntentos} intentos.`);
      }
      
      // Espera antes del siguiente reintento
      await sleep(API_CONFIG.RETRY_DELAY_MS);
      // 'continue' es implícito al final del bloque de bucle, no es necesario añadirlo.
      
    }
  }
  throw new Error(`La petición falló definitivamente para el rango ${fechaIniStr} - ${fechaFinStr}`);
}