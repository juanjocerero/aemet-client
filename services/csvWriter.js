import fs from 'fs/promises';
import { stringify } from 'csv-stringify';
import { format } from 'date-fns';
import { logger } from '../utils/consoleLogger.js';

/**
 * Guarda un array de objetos en un fichero CSV con configuración dinámica.
 * @param {Array<Object>} datos - Los datos a guardar.
 * @param {string} nombreFichero - El nombre del fichero de salida.
 * @param {Array<string|{key: string, header: string}>} columnas - La configuración de columnas.
 * @param {Object} castConfig - Opciones de formateo para los valores.
 */
async function guardarCSVGenerico(datos, nombreFichero, columnas, castConfig) {
  logger.info(`\nGenerando fichero CSV: "${nombreFichero}"...`);
  try {
    const csvStringifier = stringify({
      header: true,
      columns: columnas,
      cast: castConfig,
    });

    const csvData = await new Promise((resolve, reject) => {
      let output = '';
      csvStringifier.on('readable', () => {
        let row;
        while ((row = csvStringifier.read()) !== null) { output += row; }
      });
      csvStringifier.on('error', reject);
      csvStringifier.on('finish', () => resolve(output));
      datos.forEach(registro => csvStringifier.write(registro));
      csvStringifier.end();
    });

    await fs.writeFile(nombreFichero, csvData);
    logger.success(`✅ Fichero guardado con éxito como "${nombreFichero}".`);
  } catch (error) {
    logger.error(`❌ Error al guardar el fichero CSV: ${error.message}`);
  }
}

/**
 * Guarda los datos diarios de la AEMET.
 */
export async function guardarDatosDiariosEnCSV(datos, nombreFichero) {
  const columnasDiarias = [
    { key: 'fecha', header: 'fecha' },
    { key: 'indicativo', header: 'idema' },
    { key: 'nombre', header: 'nombre' },
    { key: 'tmed', header: 'tmed' },
    { key: 'tmin', header: 'tmin' },
    { key: 'tmax', header: 'tmax' },
    { key: 'prec', header: 'prec' },
    { key: 'velmedia', header: 'vmed' },
    { key: 'racha', header: 'racha' },
  ];
  
  const castDiario = {
    date: (value) => format(value, 'yyyy-MM-dd'),
    number: (value) => (typeof value === 'number' ? value.toString().replace('.', ',') : value),
  };
  
  await guardarCSVGenerico(datos, nombreFichero, columnasDiarias, castDiario);
}

/**
 * Guarda los datos del análisis mensual en un fichero CSV.
 */
export async function guardarAnalisisMensualEnCSV(datos, nombreFichero) {
  const columnasMensuales = [
    'fecha', 'avg_tmed', 'avg_tmax', 'avg_tmin', 'avg_prec', 'avg_velmedia',
    'max_tmed', 'd_max_tmed', 'max_tmax', 'd_max_tmax', 'max_tmin', 'd_max_tmin',
    'max_prec', 'd_max_prec', 'max_racha', 'd_max_racha', 'max_velmedia', 'd_max_velmedia',
    'min_tmed', 'd_min_tmed', 'min_tmax', 'd_min_tmax', 'min_tmin', 'd_min_tmin',
    'min_velmedia', 'd_min_velmedia',
  ];
  
  const castMensual = {
    // Formateamos los números para que usen la coma como separador decimal
    number: (value) => (typeof value === 'number' ? value.toString().replace('.', ',') : value),
  };

  await guardarCSVGenerico(datos, nombreFichero, columnasMensuales, castMensual);
}

/**
 * Guarda los datos del análisis anual en un fichero CSV.
 */
export async function guardarAnalisisAnualEnCSV(datos, nombreFichero) {
  const columnasAnuales = [
    // La cabecera es 'año', pero lee el dato de la propiedad 'fecha'
    { key: 'fecha', header: 'año' }, 
    'avg_tmed', 'avg_tmax', 'avg_tmin', 'avg_prec', 'avg_velmedia',
    'max_tmed', 'd_max_tmed', 'max_tmax', 'd_max_tmax', 'max_tmin', 'd_max_tmin',
    'max_prec', 'd_max_prec', 'max_racha', 'd_max_racha', 'max_velmedia', 'd_max_velmedia',
    'min_tmed', 'd_min_tmed', 'min_tmax', 'd_min_tmax', 'min_tmin', 'd_min_tmin',
    'min_velmedia', 'd_min_velmedia',
  ];

  const castAnual = {
    number: (value) => (typeof value === 'number' ? value.toString().replace('.', ',') : value),
  };

  await guardarCSVGenerico(datos, nombreFichero, columnasAnuales, castAnual);
}