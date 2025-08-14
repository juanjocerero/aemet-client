/**
 * summer.js (Orquestador)
 * 
 * Responsabilidad: Orquestar el flujo de análisis de datos de verano.
 * 1. Obtiene la ruta del fichero de entrada.
 * 2. Llama al parser para obtener los datos.
 * 3. Llama al analizador para obtener los resultados.
 * 4. Llama al presentador para mostrar y guardar los resultados.
 */
import path from 'path';
import { parseSummerData } from './utils/summerDataParser.js';
import { analyzeSummerData } from './utils/summerAnalysis.js';
import { presentSummerResults } from './utils/summerPresenter.js';

/**
 * Extrae el ID de la estación del nombre del fichero.
 * @param {string} filePath - Ruta al fichero.
 * @returns {string} El ID de la estación.
 */
const getStationIdFromPath = (filePath) => {
  const baseName = path.basename(filePath);
  const parts = baseName.split('_');
  return parts.length > 1 ? parts[1] : 'desconocida';
};

/**
 * Función principal asíncrona que ejecuta el proceso completo.
 */
async function main() {
  // 1. Obtener la ruta del fichero de entrada
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error('❌ Error: Debes proporcionar la ruta al fichero CSV como argumento.');
    console.log(`Ejemplo: node summer.js 'ruta/a/tus/datos.csv'`);
    process.exit(1);
  }
  const fullPath = path.resolve(inputFile);

  try {
    console.log(`
🚀 Iniciando el análisis de verano para el fichero: ${fullPath}`);
    
    // 2. Parsear los datos
    const summerRecords = await parseSummerData(fullPath);
    console.log(`
🔎 Encontrados ${summerRecords.length} registros de verano.`);

    // 3. Analizar los datos
    console.log('🧠 Realizando análisis anual y por décadas...');
    const analysisResults = analyzeSummerData(summerRecords);

    // 4. Presentar los resultados
    const stationId = getStationIdFromPath(fullPath);
    presentSummerResults(analysisResults, stationId);

  } catch (error) {
    console.error(`
❌ Ha ocurrido un error fatal en el proceso: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar el script
main();
