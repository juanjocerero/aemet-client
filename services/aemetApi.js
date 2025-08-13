// services/aemetApi.js
import { API_CONFIG, SCRIPT_SETTINGS } from '../config.js';
import { logger } from '../utils/consoleLogger.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function obtenerDatosParaRango(fechaIniStr, fechaFinStr, estacionId, apiKey) {
  const apiUrl = `https://opendata.aemet.es/opendata/api/valores/climatologicos/diarios/datos/fechaini/${fechaIniStr}/fechafin/${fechaFinStr}/estacion/${estacionId}`;
  const maxIntentos = Math.floor(API_CONFIG.MAX_RETRY_SECONDS * 1000 / API_CONFIG.RETRY_DELAY_MS);
  
  for (let i = 0; i < maxIntentos; i++) {
    try {
      const resInicial = await fetch(apiUrl, {
        headers: { 'api_key': apiKey, 'Accept': 'application/json' },
      });
      
      if (resInicial.status === 429) {
        logger.warn(`   -> Rate limiting. Reintentando en ${API_CONFIG.RETRY_DELAY_MS / 1000}s... (Intento ${i + 1}/${maxIntentos})`);
        await sleep(API_CONFIG.RETRY_DELAY_MS);
        continue;
      }
      if (!resInicial.ok) {
        throw new Error(`Error en petición inicial: ${resInicial.statusText}`);
      }
      
      const resUrlDatos = await resInicial.json();
      if (resUrlDatos.estado !== 200) {
        throw new Error(`API AEMET: ${resUrlDatos.descripcion}`);
      }
      
      const resDatosFinales = await fetch(resUrlDatos.datos);
      if (!resDatosFinales.ok) {
        throw new Error(`Error al obtener datos finales: ${resDatosFinales.statusText}`);
      }
      return await resDatosFinales.json();
      
    } catch (error) {
      // Simplemente lanzamos el error para que main.js lo capture y gestione el estado del spinner.
      // Pero si estamos en modo verbose, lo mostramos aquí para tener el contexto completo.
      if (SCRIPT_SETTINGS.VERBOSE_MODE) {
        console.error(`\nError en fetch para rango ${fechaIniStr} - ${fechaFinStr}:`, error);
      }
      throw error; // Lanzamos el error para que la lógica de main.js lo maneje
    }
  }
  throw new Error(`La petición falló definitivamente para el rango ${fechaIniStr} - ${fechaFinStr}`);
}