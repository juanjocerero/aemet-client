import { format } from 'date-fns';
import { groupBy, map, meanBy, maxBy, minBy, sortBy } from 'lodash-es';

/**
* Redondea un número a un máximo de dos decimales.
* @param {number} num - El número a redondear.
* @returns {number | null} El número redondeado o null si la entrada no es válida.
*/
const round = (num) => (typeof num === 'number' ? parseFloat(num.toFixed(2)) : null);

/**
* Encuentra un valor extremo (máximo o mínimo) en un conjunto de datos y devuelve el valor y su fecha.
* @param {Array<Object>} data - El conjunto de datos del mes.
* @param {string} field - El campo a evaluar (ej: 'tmax').
* @param {'max' | 'min'} mode - Si se busca el máximo ('max') o el mínimo ('min').
* @returns {{value: number | null, date: string | null}} Objeto con el valor y la fecha formateada.
*/
const findExtreme = (data, field, mode) => {
  const func = mode === 'max' ? maxBy : minBy;
  const record = func(data, d => d[field]);
  
  if (!record || record[field] === null) {
    return { value: null, date: null };
  }
  
  return {
    value: round(record[field]),
    date: format(record.date, 'dd/MM/yyyy'),
  };
};

/**
* Función genérica y reutilizable para analizar datos agrupados.
* @param {Array<Object>} dailyData - Datos diarios.
* @param {Function} groupByFn - Función que determina cómo agrupar los datos (por mes, por año, etc.).
* @returns {Array<Object>} Datos analizados y agrupados.
* @private
*/
function _analizarDatosAgrupados(dailyData, groupByFn) {
  const groupedData = groupBy(dailyData, groupByFn);
  
  const analysis = map(groupedData, (groupData, groupKey) => {
    const getMax = (field) => findExtreme(groupData, field, 'max');
    const getMin = (field) => findExtreme(groupData, field, 'min');
    
    const maxTmed = getMax('tmed');
    const maxTmax = getMax('tmax');
    const maxTmin = getMax('tmin');
    const maxPrec = getMax('prec');
    const maxRacha = getMax('racha');
    const maxVelmedia = getMax('velmedia');
    
    const minTmed = getMin('tmed');
    const minTmax = getMin('tmax');
    const minTmin = getMin('tmin');
    
    return {
      fecha: groupKey,
      avg_tmed: round(meanBy(groupData, 'tmed')),
      avg_tmax: round(meanBy(groupData, 'tmax')),
      avg_tmin: round(meanBy(groupData, 'tmin')),
      avg_prec: round(meanBy(groupData, 'prec')),
      avg_velmedia: round(meanBy(groupData, 'velmedia')),
      max_tmed: maxTmed.value,
      d_max_tmed: maxTmed.date,
      max_tmax: maxTmax.value,
      d_max_tmax: maxTmax.date,
      max_tmin: maxTmin.value,
      d_max_tmin: maxTmin.date,
      max_prec: maxPrec.value,
      d_max_prec: maxPrec.date,
      max_racha: maxRacha.value,
      d_max_racha: maxRacha.date,
      max_velmedia: maxVelmedia.value,
      d_max_velmedia: maxVelmedia.date,
      min_tmed: minTmed.value,
      d_min_tmed: minTmed.date,
      min_tmax: minTmax.value,
      d_min_tmax: minTmax.date,
      min_tmin: minTmin.value,
      d_min_tmin: minTmin.date,
    };
  });
  
  // Ordenar el resultado final por la clave de agrupación (fecha/año)
  return sortBy(analysis, 'fecha');
}

/**
* Analiza los datos diarios para generar un resumen estadístico mensual.
*/
export function analizarDatosMensuales(dailyData) {
  return _analizarDatosAgrupados(dailyData, (d) => format(d.date, 'yyyy-MM'));
}

/**
* Analiza los datos diarios para generar un resumen estadístico anual.
*/
export function analizarDatosAnuales(dailyData) {
  return _analizarDatosAgrupados(dailyData, (d) => format(d.date, 'yyyy'));
}