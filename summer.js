// Importación de las librerías con sintaxis de ES Modules
import fs from 'fs';
import readline from 'readline';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { parseISO, getYear, startOfDay, isWithinInterval } from 'date-fns';
import _ from 'lodash-es'; 

/**
* Calcula la estación astronómica para una fecha dada en el hemisferio norte.
* @param {Date} date - El objeto de fecha de date-fns.
* @returns {string} El nombre de la estación.
*/
const getAstronomicalSeason = (date) => {
  const year = getYear(date);
  const springStart = startOfDay(new Date(year, 2, 20));
  const summerStart = startOfDay(new Date(year, 5, 21));
  const autumnStart = startOfDay(new Date(year, 8, 22));
  const winterStart = startOfDay(new Date(year, 11, 21));
  
  if (isWithinInterval(date, { start: summerStart, end: autumnStart })) return 'Verano';
  if (isWithinInterval(date, { start: springStart, end: summerStart })) return 'Primavera';
  if (isWithinInterval(date, { start: autumnStart, end: winterStart })) return 'Otoño';
  return 'Invierno';
};

/**
* Función principal que lee, procesa y escribe los datos del fichero CSV.
* @param {string} filePath - La ruta al fichero CSV que se va a analizar.
*/
const analizarFichero = (filePath) => {
  if (!fs.existsSync(filePath)) {
    console.error(`\nError: El fichero no existe en la ruta especificada: ${filePath}`);
    return;
  }
  
  console.log(`\nIniciando el análisis del fichero: ${filePath}`);
  const records = [];
  
  fs.createReadStream(filePath)
  .pipe(parse({
    columns: true,
    delimiter: ',',
    trim: true,
    cast: (value, context) => {
      if (['tmed', 'tmin', 'tmax'].includes(context.column)) {
        return parseFloat(String(value).replace(',', '.'));
      }
      return value;
    }
  }))
  .on('error', (error) => {
    console.error(`Error leyendo el CSV en '${filePath}':`, error.message);
  })
  .on('data', (row) => {
    try {
      const dateObject = parseISO(row.fecha);
      row.fecha_js = dateObject;
      row.estacion = getAstronomicalSeason(dateObject);
      records.push(row);
    } catch (error) {
      console.error(`Error procesando la fila: ${JSON.stringify(row)}. Error: ${error.message}`);
    }
  })
  .on('end', () => {
    const summerRecords = records.filter(record => record.estacion === 'Verano');
    const summerByYear = _.groupBy(summerRecords, record => getYear(record.fecha_js));
    
    const summerAverages = _.map(summerByYear, (yearRecords, year) => ({
      'Año': parseInt(year),
      'Temperatura Media Verano (°C)': parseFloat(_.meanBy(yearRecords, 'tmed').toFixed(2)),
      'Temperatura Mínima Verano (°C)': parseFloat(_.meanBy(yearRecords, 'tmin').toFixed(2)),
      'Temperatura Máxima Verano (°C)': parseFloat(_.meanBy(yearRecords, 'tmax').toFixed(2)),
    }));
    
    if (summerAverages.length === 0) {
      console.log("No se encontraron datos de verano en el fichero proporcionado.");
      return;
    }
    
    console.log("\nValores medios de verano calculados por año:");
    console.table(summerAverages);
    
    stringify(summerAverages, { header: true }, (err, output) => {
      if (err) {
        console.error("Error al generar el string CSV:", err.message);
        return;
      }
      fs.writeFile('datos_verano.csv', output, (err) => {
        if (err) {
          console.error("Error al escribir el fichero 'datos_verano.csv':", err.message);
          return;
        }
        console.log("\nAnálisis completado. Fichero 'datos_verano.csv' guardado con éxito.");
      });
    });
  });
};

// --- Inicio de la parte interactiva ---

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Por favor, introduce la ruta del fichero CSV a analizar: ', (filePath) => {
  analizarFichero(filePath);
  rl.close();
});