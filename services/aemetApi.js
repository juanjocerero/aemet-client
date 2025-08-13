// services/aemetApi.js
import { API_CONFIG, SCRIPT_SETTINGS } from '../config.js';
import { logger } from '../utils/consoleLogger.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function obtenerDatosParaRango(fechaIniStr, fechaFinStr, estacionId) {
  const apiKey = process.env.AEMET_API_KEY;
  // LA URL AHORA SE CONSTRUYE DESDE LA CONFIGURACIÓN
  const apiUrl = `${API_CONFIG.BASE_URL}/valores/climatologicos/diarios/datos/fechaini/${fechaIniStr}/fechafin/${fechaFinStr}/estacion/${estacionId}`;
  
  const maxIntentos = Math.floor(API_CONFIG.MAX_RETRY_SECONDS * 1000 / API_CONFIG.RETRY_DELAY_MS);
  for (let i = 0; i < maxIntentos; i++) {
    try {
      logger.setWarning(null);
      const resInicial = await fetch(apiUrl, {
        headers: { 'api_key': apiKey, 'Accept': 'application/json' },
      });
      
      if (resInicial.status === 429) {
        throw new Error(`Rate limiting (429)`);
      }
      if (!resInicial.ok) {
        throw new Error(`Error en petición inicial: ${resInicial.status} ${resInicial.statusText}`);
      }
      
      const resUrlDatos = await resInicial.json();
      if (resUrlDatos.estado !== 200) {
        throw new Error(`Error en la respuesta de Aemet: ${resUrlDatos.descripcion}`);
      }
      
      const resDatosFinales = await fetch(resUrlDatos.datos);
      if (!resDatosFinales.ok) {
        throw new Error(`Error al obtener datos finales: ${resDatosFinales.status} ${resDatosFinales.statusText}`);
      }
      logger.setWarning(null);
      return await resDatosFinales.json();
    } catch (error) {
      const esUltimoIntento = i === maxIntentos - 1;
      const mensajeReintento = `Error en petición. Reintentando en ${API_CONFIG.RETRY_DELAY_MS / 1000}s... (Intento ${i + 1}/${maxIntentos})`;
      logger.setWarning(mensajeReintento);
      if (SCRIPT_SETTINGS.VERBOSE_MODE) {
        console.error(`\n[VERBOSE] Detalles del error:`, error);
      }
      if (esUltimoIntento) {
        throw new Error(`La petición falló definitivamente para el rango ${fechaIniStr} - ${fechaFinStr} tras ${maxIntentos} intentos.`);
      }
      await sleep(API_CONFIG.RETRY_DELAY_MS);
    }
  }
  throw new Error(`La petición falló definitivamente para el rango ${fechaIniStr} - ${fechaFinStr}`);
}