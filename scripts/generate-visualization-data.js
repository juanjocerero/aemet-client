
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateLongerSummer } from '../src/utils/analysis/longerSummer.js';
import { readData, normalizarDatos } from '../src/utils/dataProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '..', 'datos_5530E_19720101_20250819', 'diarios_5530E_19720101_20250819.csv');
const OUTPUT_DIR = path.join(__dirname, '..', 'visualizacion');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'veranos.json');

function generateData() {
  try {
    console.log(`Leyendo datos de ${DATA_FILE}...`);
    const rawData = readData(DATA_FILE);
    console.log(`  - Registros leídos: ${rawData.length}`);

    console.log('Normalizando datos...');
    const allRecords = normalizarDatos(rawData);
    console.log(`  - Registros normalizados: ${allRecords.length}`);

    console.log('Calculando la duración de los veranos...');
    const summerData = calculateLongerSummer(allRecords);
    console.log(`  - Años con datos de verano: ${summerData.length}`);

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR);
    }

    console.log(`Escribiendo datos en ${OUTPUT_FILE}...`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(summerData, null, 2));

    console.log('Proceso completado con éxito.');
  } catch (error) {
    console.error('Error durante la generación de datos:', error);
  }
}

generateData();
