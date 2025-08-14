// services/aemetApi.js
import { API_CONFIG, SCRIPT_SETTINGS } from '../config.js';
import { logger } from '../utils/consoleLogger.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function obtenerDatosParaRango(fechaIniStr, fechaFinStr, estacionId) {
  const apiKey = process.env.AEMET_API_KEY;
  const apiUrl = `${API_CONFIG.BASE_URL}/valores/climatologicos/diarios/datos/fechaini/${fechaIniStr}/fechafin/${fechaFinStr}/estacion/${estacionId}`;
  
  const maxIntentos = Math.floor(API_CONFIG.MAX_RETRY_SECONDS * 1000 / API_CONFIG.RETRY_DELAY_MS);
  for (let i = 0; i < maxIntentos; i++) {
    try {
      logger.setWarning(null);

      if (SCRIPT_SETTINGS.VERBOSE_MODE) {
        logger.info(`[VERBOSE] Petición inicial (Intento ${i + 1}/${maxIntentos}): GET ${apiUrl}`);
      }

      const resInicial = await fetch(apiUrl, {
        headers: { 'api_key': apiKey, 'Accept': 'application/json' },
      });

      if (SCRIPT_SETTINGS.VERBOSE_MODE) {
        // Clonamos la respuesta para poder leerla aquí y luego en el resto del código
        const resClone = resInicial.clone();
        const resBody = await resClone.text();
        logger.info(`[VERBOSE] Respuesta inicial: ${resClone.status} ${resClone.statusText}`);
        logger.info(`[VERBOSE] Cuerpo de la respuesta inicial:\n${resBody}`);
      }
      
      if (resInicial.status === 429) {
        throw new Error(`Rate limiting (429)`);
      }
      if (!resInicial.ok) {
        const errorBody = await resInicial.text();
        throw new Error(`Error en petición inicial: ${resInicial.status} ${resInicial.statusText}. Respuesta: ${errorBody}`);
      }
      
      const resUrlDatos = await resInicial.json();
      if (resUrlDatos.estado !== 200) {
        throw new Error(`Error en la respuesta de Aemet: ${resUrlDatos.descripcion}`);
      }

      if (SCRIPT_SETTINGS.VERBOSE_MODE) {
        logger.info(`[VERBOSE] Petición de datos finales: GET ${resUrlDatos.datos}`);
      }
      
      const resDatosFinales = await fetch(resUrlDatos.datos);

      if (SCRIPT_SETTINGS.VERBOSE_MODE) {
        const resClone = resDatosFinales.clone();
        // const resBody = await resClone.text(); // Descomentar para inspeccionar el cuerpo
        logger.info(`[VERBOSE] Respuesta de datos finales: ${resClone.status} ${resClone.statusText}`);
        // logger.info(`[VERBOSE] Cuerpo de la respuesta de datos finales:\n${resBody}`);
      }

      if (!resDatosFinales.ok) {
        const errorBody = await resDatosFinales.text();
        throw new Error(`Error al obtener datos finales: ${resDatosFinales.status} ${resDatosFinales.statusText}. Respuesta: ${errorBody}`);
      }
      logger.setWarning(null);
      return await resDatosFinales.json();
    } catch (error) {
      const esUltimoIntento = i === maxIntentos - 1;
      const mensajeReintento = `Error en petición. Reintentando en ${API_CONFIG.RETRY_DELAY_MS / 1000}s... (Intento ${i + 1}/${maxIntentos})`;
      logger.setWarning(mensajeReintento);
      if (SCRIPT_SETTINGS.VERBOSE_MODE) {
        // El error ya se loguea con más detalle gracias a los logs anteriores,
        // pero mantenemos este por si algo se escapa.
        console.error(`\n[VERBOSE] Error capturado en el bloque catch:`, error);
      }
      if (esUltimoIntento) {
        throw new Error(`La petición falló definitivamente para el rango ${fechaIniStr} - ${fechaFinStr} tras ${maxIntentos} intentos.`);
      }
      await sleep(API_CONFIG.RETRY_DELAY_MS);
    }
  }
  throw new Error(`La petición falló definitivamente para el rango ${fechaIniStr} - ${fechaFinStr}`);
}