// utils/dataProcessor.js
import { parse, isValid, getYear, startOfDay, isWithinInterval } from 'date-fns';

const toTitleCase = (texto) => {
  if (!texto) return '';
  return texto.toLowerCase().split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
};

const toNumber = (valor) => {
  if (typeof valor !== 'string' || valor.trim() === '') return null;
  const valorNumerico = parseFloat(valor.replace(',', '.'));
  return isNaN(valorNumerico) ? null : valorNumerico;
};

/**
 * Calcula la estación astronómica para una fecha dada en el hemisferio norte.
 * Las fechas de inicio de las estaciones pueden variar ligeramente cada año.
 * Estas son las fechas comúnmente aceptadas para el propósito general.
 * @param {Date} date - El objeto de fecha de date-fns.
 * @returns {string} El nombre de la estación.
 */
const getAstronomicalSeason = (date) => {
  const year = getYear(date);

  // Fechas de inicio de las estaciones (Hemisferio Norte)
  // Usamos startOfDay para ignorar la hora y asegurar una comparación limpia.
  const springStart = startOfDay(new Date(year, 2, 20)); // ~20 de Marzo
  const summerStart = startOfDay(new Date(year, 5, 21));  // ~21 de Junio
  const autumnStart = startOfDay(new Date(year, 8, 22));  // ~22 de Septiembre
  const winterStart = startOfDay(new Date(year, 11, 21)); // ~21 de Diciembre

  if (isWithinInterval(date, { start: springStart, end: summerStart })) {
    return 'Primavera';
  }
  
  if (isWithinInterval(date, { start: summerStart, end: autumnStart })) {
    return 'Verano';
  }

  if (isWithinInterval(date, { start: autumnStart, end: winterStart })) {
    return 'Otoño';
  }

  // Si no está en las anteriores, es Invierno (incluyendo el final de diciembre
  // y el principio del año hasta la primavera).
  return 'Invierno';
};

export function normalizarDatos(datosBrutos) {
  return datosBrutos.map(r => {
    const date = parse(r.fecha, 'yyyy-MM-dd', new Date());
    return {
      date,
      fecha: r.fecha,
      estacion: getAstronomicalSeason(date),
      indicativo: r.indicativo,
      nombre: toTitleCase(r.nombre),
      tmed: toNumber(r.tmed),
      prec: toNumber(r.prec),
      tmin: toNumber(r.tmin),
      tmax: toNumber(r.tmax),
      velmedia: toNumber(r.velmedia),
      racha: toNumber(r.racha),
    };
  })
  .filter(r => isValid(r.date));
}