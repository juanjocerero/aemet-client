// index.js
import 'dotenv/config';
import readline from 'readline';
import { parseArgs } from 'util';
import { SCRIPT_SETTINGS } from './src/config.js';
import { parse, isValid } from 'date-fns';
import { logger } from './src/utils/consoleLogger.js';
import { procesarEstacion } from './src/extraction-worker.js';

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
    logger.fail(`Error al parsear los argumentos: ${error.message}`);
    process.exit(1);
  }
}

async function iniciarProcesoInteractivo() {
  // Se ejecuta justo al inicio.
  setupFromCLIArgs();

  // Validar que la API Key esté disponible en el entorno
  if (!process.env.AEMET_API_KEY) {
    logger.fail('Error crítico: La variable de entorno AEMET_API_KEY no está definida.');
    logger.info('Por favor, crea un fichero .env en la raíz del proyecto y añade la línea: AEMET_API_KEY="tu_clave"');
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (query) => new Promise(resolve => rl.question(query, resolve));

  // Usamos el nuevo método 'log' para que no interactúe con el spinner
  logger.log(logger.magentaBold('--- Configuración del Script de Descarga de Aemet ---'));

  try {
    const estacionesInput = await ask(logger.query('📡 Introduce ID(s) de estación (ej: 5530E,9434) [Por defecto: 5530E]: '));
    const estaciones = (estacionesInput || '5530E').split(',').map(s => s.trim());

    const fechaInicioInput = await ask(logger.query('🗓️  Introduce la fecha de inicio (DD/MM/YYYY) [Por defecto: 01/01/1972]: '));
    const fechaInicio = fechaInicioInput ? parse(fechaInicioInput, 'dd/MM/yyyy', new Date()) : new Date('1972-01-01T00:00:00Z');
    if (!isValid(fechaInicio)) throw new Error('Formato de fecha de inicio no válido. Usa DD/MM/YYYY.');

    const fechaFinInput = await ask(logger.query('🗓️  Introduce la fecha de fin (DD/MM/YYYY) [Por defecto: Hoy]: '));
    const fechaFin = fechaFinInput ? parse(fechaFinInput, 'dd/MM/yyyy', new Date()) : new Date();
    if (!isValid(fechaFin)) throw new Error('Formato de fecha de fin no válido. Usa DD/MM/YYYY.');
    
    logger.info(`\nSe procesarán ${estaciones.length} estación(es) de forma secuencial.`);

    for (const estacion of estaciones) {
      await procesarEstacion(estacion, fechaInicio, fechaFin);
      logger.succeed(`Proceso para la estación ${estacion} finalizado.`);
    }

    logger.log(`\n\n${logger.magentaBold('🎉🎉🎉 ¡Todos los procesos han finalizado! 🎉🎉🎉')}`);

  } catch (error) {
    logger.fail(`\nError fatal durante la configuración: ${error.message}`);
  } finally {
    rl.close();
  }
}

iniciarProcesoInteractivo();