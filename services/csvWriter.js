// services/csvWriter.js
import { stringify } from 'csv-stringify';
import fs from 'node:fs';

/**
 * Crea un stream de escritura CSV.
 * Esta función configura un stream de escritura a un fichero y le conecta
 * un transformador que convierte objetos JavaScript a formato CSV.
 *
 * @param {string} nombreFichero - La ruta completa donde se guardará el fichero.
 * @param {Array<Object|string>} columnas - La configuración de columnas para csv-stringify.
 * @param {Object} castConfig - La configuración de 'cast' para formatear valores.
 * @returns {import('stream').Writable} Un stream escribible. Escribe objetos JS en este stream.
 */
function crearStreamEscritorCSV(nombreFichero, columnas, castConfig) {
  // Stream de escritura al sistema de ficheros
  const streamFichero = fs.createWriteStream(nombreFichero);

  // Transformador de objeto a CSV
  const csvStringifier = stringify({
    header: true,
    columns: columnas,
    cast: castConfig,
  });

  // Conectamos el transformador al stream del fichero.
  // Lo que entre en csvStringifier será procesado y pasará a streamFichero.
  csvStringifier.pipe(streamFichero);

  // Gestionamos errores para no dejar el proceso colgado.
  streamFichero.on('error', (err) => console.error(`Error de escritura en ${nombreFichero}:`, err));
  csvStringifier.on('error', (err) => console.error(`Error del stringifier para ${nombreFichero}:`, err));

  // 4. Devolvemos el transformador. Este es nuestro "punto de entrada" para los datos.
  return csvStringifier;
}

// Las funciones exportadas ahora simplemente configuran y devuelven el stream.
export function crearStreamCSVDiario(nombreFichero) {
  const columnas = [
    { key: 'fecha', header: 'fecha' }, { key: 'indicativo', header: 'idema' },
    { key: 'nombre', header: 'nombre' }, { key: 'tmed', header: 'tmed' },
    { key: 'tmin', header: 'tmin' }, { key: 'tmax', header: 'tmax' },
    { key: 'prec', header: 'prec' }, { key: 'velmedia', header: 'vmed' },
    { key: 'racha', header: 'racha' },
  ];
  const cast = {
    number: (value) => (typeof value === 'number' ? value.toString().replace('.', ',') : value),
  };
  return crearStreamEscritorCSV(nombreFichero, columnas, cast);
}

// Los datos se generarán al final, por lo que la función de guardado se mantiene
// pero se usará de una forma diferente desde main.js

export async function guardarAnalisisEnCSV(datos, nombreFichero, columnas, castConfig) {
    const csvStringifier = stringify({ header: true, columns: columnas, cast: castConfig });
    const streamFichero = fs.createWriteStream(nombreFichero);
    csvStringifier.pipe(streamFichero);

    return new Promise((resolve, reject) => {
        streamFichero.on('finish', resolve);
        streamFichero.on('error', reject);
        datos.forEach(registro => csvStringifier.write(registro));
        csvStringifier.end();
    });
}