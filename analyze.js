/**
 * summer.js (Orquestador)
 * 
 * Responsabilidad: Orquestar el flujo de análisis de datos de verano.
 */
import path from 'path';
import { readAndProcessData } from './src/utils/dataLoader.js';
import { analyzeSummerData } from './src/utils/summerAnalysis.js';
import { presentSummerResults } from './src/utils/summerPresenter.js';

/**
 * Extrae el ID de la estación del nombre del fichero.
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
    
    // 1. Parsear TODOS los datos del fichero
    const allRecords = await readAndProcessData(fullPath);
    console.log(`
🔎 Encontrados ${allRecords.length} registros climáticos en total.`);

    // 2. Analizar los datos (el módulo de análisis se encarga de filtrar lo que necesita)
    console.log('🧠 Realizando todos los análisis...');
    const analysisResults = analyzeSummerData(allRecords);

    // 3. Presentar los resultados
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
