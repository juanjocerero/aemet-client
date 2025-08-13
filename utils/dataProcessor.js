// utils/dataProcessor.js
import { parse } from 'date-fns';

const toTitleCase = (texto) => {
  if (!texto) return '';
  return texto.toLowerCase().split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
};

const toNumber = (valor) => {
  if (typeof valor !== 'string' || valor.trim() === '') return null;
  const valorNumerico = parseFloat(valor.replace(',', '.'));
  return isNaN(valorNumerico) ? null : valorNumerico;
};

export function normalizarDatos(datosBrutos) {
  logger.info('   Normalizando los datos recibidos...');
  return datosBrutos.map(r => ({
    fecha: r.fecha,
    date: parse(r.fecha, 'yyyy-MM-dd', new Date()),
    indicativo: r.indicativo,
    nombre: toTitleCase(r.nombre),
    tmed: toNumber(r.tmed),
    prec: toNumber(r.prec),
    tmin: toNumber(r.tmin),
    tmax: toNumber(r.tmax),
    velmedia: toNumber(r.velmedia),
    racha: toNumber(r.racha),
  }));
}

export function deduplicarPorFecha(datos) {
  logger.info('Deduplicando registros por fecha...');
  const mapaDeDatos = new Map(datos.map(r => [new Date(r.fecha).getTime(), r]));
  const datosUnicos = Array.from(mapaDeDatos.values());
  datosUnicos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  return datosUnicos;
}