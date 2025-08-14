/**
 * utils/consoleColorizer.js
 * 
 * Utilidad para crear tablas de consola coloreadas y formateadas.
 */
import chalk from 'chalk';
import Table from 'cli-table3';

// --- Lógica de Coloreado con Chalk ---

const lerpColor = (factor, color1, color2) => ({
  r: Math.round(color1.r + factor * (color2.r - color1.r)),
  g: Math.round(color1.g + factor * (color2.g - color1.g)),
  b: Math.round(color1.b + factor * (color2.b - color1.b)),
});

const BLUE = { r: 30, g: 144, b: 255 };
const WHITE = { r: 240, g: 240, b: 240 };
const RED = { r: 255, g: 99, b: 71 };
const YELLOW = { r: 255, g: 255, b: 224 };

function colorizeValue(value, min, max, type, decimals = 2) {
  if (typeof value !== 'number' || isNaN(value)) return String(value);

  let color;
  if (type === 'deviation') {
    const mid = 0;
    if (value < mid) {
      const factor = min < 0 ? value / min : 0;
      color = lerpColor(factor, WHITE, BLUE);
    } else {
      const factor = max > 0 ? value / max : 0;
      color = lerpColor(factor, WHITE, RED);
    }
  } else { // gradient
    const range = max - min;
    const factor = range > 0 ? (value - min) / range : 0;
    color = lerpColor(factor, YELLOW, RED);
  }

  return chalk.rgb(color.r, color.g, color.b)(value.toFixed(decimals));
}

// --- Lógica de Creación de Tabla ---

const getVisibleLength = (str) => {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '').length;
};

/**
 * Crea y formatea una tabla como string, con opciones de coloreado y centrado.
 * @param {Array<Object>} data - El array de objetos (datos crudos).
 * @param {Object} columnConfigs - Configuración de las columnas a colorear.
 * @param {Object} options - Opciones de formato, ej. { center: true }.
 * @returns {string} Una cadena de texto con la tabla lista para imprimir.
 */
export function createFormattedTable(data, columnConfigs, options = {}) {
  if (data.length === 0) {
    return 'No hay datos para mostrar.';
  }

  const headers = Object.keys(data[0]);
  const table = new Table({ head: headers.map(h => chalk.cyan(h)) });

  const valueRanges = {};
  for (const column of Object.keys(columnConfigs)) {
    const values = data.map(row => parseFloat(row[column])).filter(v => !isNaN(v));
    if (values.length > 0) {
      valueRanges[column] = { min: Math.min(...values), max: Math.max(...values) };
    }
  }

  for (const row of data) {
    const newRow = [];
    for (const header of headers) {
      const value = row[header];
      const config = columnConfigs[header];
      if (config && valueRanges[header]) {
        const { min, max } = valueRanges[header];
        newRow.push(colorizeValue(parseFloat(value), min, max, config.type, config.decimals));
      } else {
        newRow.push(value);
      }
    }
    table.push(newRow);
  }

  const tableString = table.toString();

  if (options.center) {
    const terminalWidth = process.stdout.columns || 80;
    const tableLines = tableString.split('\n');
    const centeredLines = tableLines.map(line => {
      const visibleLength = getVisibleLength(line);
      const padding = Math.max(0, Math.floor((terminalWidth - visibleLength) / 2));
      return ' '.repeat(padding) + line;
    });
    return centeredLines.join('\n');
  }

  return tableString;
}
