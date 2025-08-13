// index.js
import readline from 'readline';
import { parseArgs } from 'util';
import { SCRIPT_SETTINGS } from './config.js';
import { parse, isValid } from 'date-fns';
import { logger } from './utils/consoleLogger.js';
import { procesarEstacion } from './main.js';

/**
 * ¡Parsea los argumentos de la línea de comandos para configurar el script.
 */
function setupFromCLIArgs() {
  const options = {
    verbose: {
      type: 'boolean',
      short: 'v',
    },
  };

  try {
    const { values } = parseArgs({ options });
    if (values.verbose) {
      SCRIPT_SETTINGS.VERBOSE_MODE = true;
      logger.warn('Modo Verbose activado. Se mostrarán los errores completos.');
    }
  } catch (error) {
    logger.error(`Error al parsear los argumentos: ${error.message}`);
    process.exit(1);
  }
}

async function iniciarProcesoInteractivo() {
  // Se ejecuta justo al inicio.
  setupFromCLIArgs();
  
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (query) => new Promise(resolve => rl.question(query, resolve));

  logger.info(logger.magentaBold('--- Configuración del Script de Descarga de AEMET ---'));

  try {
    const queryColor = logger.cyan;
    const apiKey = await ask(`${queryColor('🔑 Introduce tu API Key de AEMET: ')}`);
    if (!apiKey) throw new Error('La API Key es obligatoria.');

    const estacionesInput = await ask(`${queryColor('📡 Introduce ID(s) de estación (ej: 5530E,9434) [5530E]: ')}`);
    const estaciones = (estacionesInput || '5530E').split(',').map(s => s.trim());

    const fechaInicioInput = await ask(`${queryColor('🗓️  Fecha de inicio (DD/MM/YYYY) [01/01/1972]: ')}`);
    const fechaInicio = fechaInicioInput ? parse(fechaInicioInput, 'dd/MM/yyyy', new Date()) : new Date('1972-01-01T00:00:00Z');
    if (!isValid(fechaInicio)) throw new Error('Formato de fecha de inicio no válido. Usa DD/MM/YYYY.');

    const fechaFinInput = await ask(`${queryColor('🗓️  Fecha de fin (DD/MM/YYYY) [Hoy]: ')}`);
    const fechaFin = fechaFinInput ? parse(fechaFinInput, 'dd/MM/yyyy', new Date()) : new Date();
    if (!isValid(fechaFin)) throw new Error('Formato de fecha de fin no válido. Usa DD/MM/YYYY.');
    
    logger.info(`\nSe procesarán ${estaciones.length} estación(es) de forma secuencial.`);

    for (const estacion of estaciones) {
      await procesarEstacion(estacion, apiKey, fechaInicio, fechaFin);
      logger.success(`\n✅ Proceso para la estación ${estacion} finalizado.`);
    }

    logger.success(`\n\n🎉🎉🎉 ¡Todos los procesos han finalizado! 🎉🎉🎉`);

  } catch (error) {
    logger.error(`\nError fatal durante la configuración: ${error.message}`);
  } finally {
    rl.close();
  }
}

iniciarProcesoInteractivo();