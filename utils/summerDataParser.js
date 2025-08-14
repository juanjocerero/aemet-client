/**
 * utils/summerDataParser.js
 * 
 * Responsabilidad: Leer un fichero CSV de datos climáticos y devolver
 * solo los registros de verano, parseados y listos para analizar.
 */
import fs from 'fs';
import { parse } from 'csv-parse';
import { parseISO, getYear, startOfDay, isWithinInterval } from 'date-fns';

/**
 * Calcula la estación astronómica para una fecha dada en el hemisferio norte.
 * @param {Date} date - El objeto de fecha de date-fns.
 * @returns {string} El nombre de la estación.
 */
const getAstronomicalSeason = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date)) {
    return 'Invalid Date';
  }
  const year = getYear(date);
  const summerStart = startOfDay(new Date(year, 5, 21)); // 21 de Junio
  const autumnStart = startOfDay(new Date(year, 8, 22)); // 22 de Septiembre
  
  return isWithinInterval(date, { start: summerStart, end: autumnStart }) ? 'Verano' : 'Otra';
};

/**
 * Lee y parsea un fichero CSV, devolviendo solo los registros de verano.
 * @param {string} filePath - La ruta al fichero CSV.
 * @returns {Promise<Array<Object>>} Una promesa que resuelve a un array de registros de verano.
 */
export function parseSummerData(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];

    fs.createReadStream(filePath)
      .pipe(parse({
        columns: true,
        delimiter: ',',
        trim: true,
        cast: (value, context) => {
          if (['tmed', 'tmin', 'tmax'].includes(context.column)) {
            if (value === '' || value === null) return null;
            const num = parseFloat(String(value).replace(',', '.'));
            return isNaN(num) ? null : num;
          }
          return value;
        }
      }))
      .on('error', (error) => {
        reject(new Error(`Error leyendo el CSV en '${filePath}': ${error.message}`));
      })
      .on('data', (row) => {
        try {
          row.fecha_js = parseISO(row.fecha);
          row.estacion = getAstronomicalSeason(row.fecha_js);
          records.push(row);
        } catch (error) {
          // Ignoramos filas con fechas inválidas, pero lo notificamos
          console.warn(`⚠️ Fila ignorada por fecha inválida: ${JSON.stringify(row)}`);
        }
      })
      .on('end', () => {
        const summerRecords = records.filter(r => r.estacion === 'Verano');
        if (summerRecords.length === 0) {
          reject(new Error('No se encontraron datos de verano en el fichero proporcionado.'));
        } else {
          resolve(summerRecords);
        }
      });
  });
}
