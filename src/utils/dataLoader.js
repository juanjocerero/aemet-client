/**
 * utils/dataLoader.js
 *
 * Responsabilidad: Leer un fichero CSV de datos climáticos y
 * devolver los registros parseados y listos para analizar.
 */
import fs from 'fs';
import { parse } from 'csv-parse';
import { parse as parseDate, isValid } from 'date-fns';

const toNumber = (valor) => {
  if (typeof valor !== 'string' || valor.trim() === '') return null;
  const valorNumerico = parseFloat(valor.replace(',', '.'));
  return isNaN(valorNumerico) ? null : valorNumerico;
};

/**
 * Lee y parsea un fichero CSV, devolviendo todos los registros.
 * @param {string} filePath - La ruta al fichero CSV.
 * @returns {Promise<Array<Object>>} Una promesa que resuelve a un array de registros.
 */
export function readAndProcessData(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];

    fs.createReadStream(filePath)
      .pipe(parse({
        columns: true,
        delimiter: ',',
        trim: true,
        cast: (value, context) => {
          if (['tmed', 'tmin', 'tmax', 'prec', 'velmedia', 'racha'].includes(context.column)) {
            return toNumber(value);
          }
          return value;
        }
      }))
      .on('error', (error) => {
        reject(new Error(`Error leyendo el CSV en '${filePath}': ${error.message}`));
      })
      .on('data', (row) => {
        const date = parseDate(row.fecha, 'yyyy-MM-dd', new Date());
        if (isValid(date)) {
          records.push({
            ...row,
            date,
          });
        }
      })
      .on('end', () => {
        if (records.length === 0) {
          reject(new Error('No se encontraron datos válidos en el fichero proporcionado.'));
        } else {
          records.sort((a, b) => a.date - b.date);
          resolve(records);
        }
      });
  });
}