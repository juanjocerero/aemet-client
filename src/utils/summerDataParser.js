/**
 * utils/summerDataParser.js
 * 
 * Responsabilidad: Leer un fichero CSV de datos climáticos y 
 * devolver los registros parseados y listos para analizar.
 */
import fs from 'fs';
import { parse } from 'csv-parse';
import { parseISO } from 'date-fns';

/**
 * Lee y parsea un fichero CSV, devolviendo todos los registros.
 * @param {string} filePath - La ruta al fichero CSV.
 * @returns {Promise<Array<Object>>} Una promesa que resuelve a un array de registros.
 */
export function parseClimateData(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];

    fs.createReadStream(filePath)
      .pipe(parse({
        columns: true,
        delimiter: ',',
        trim: true,
        cast: (value, context) => {
          if (['tmed', 'tmin', 'tmax', 'prec', 'velmedia', 'racha'].includes(context.column)) {
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
          // Aseguramos que la fecha es un objeto Date válido
          const dateObject = parseISO(row.fecha);
          if (dateObject instanceof Date && !isNaN(dateObject)) {
            row.fecha_js = dateObject;
            records.push(row);
          }
        } catch (error) {
          // Ignoramos filas con fechas inválidas
        }
      })
      .on('end', () => {
        if (records.length === 0) {
          reject(new Error('No se encontraron datos válidos en el fichero proporcionado.'));
        } else {
          // Ordenamos los registros por fecha, es crucial para los análisis secuenciales
          records.sort((a, b) => a.fecha_js - b.fecha_js);
          resolve(records);
        }
      });
  });
}