// utils/consoleLogger.js

import ora from 'ora';
import { CONSOLE_COLORS as colors } from '../config.js';

// Creamos una única instancia del spinner que gestionaremos en este módulo.
const spinner = ora({
  color: 'cyan',
});

// Variables para gestionar el estado del texto
let currentProgressText = '';
let currentStatusText = '';

// Función interna para actualizar el texto del spinner
function _updateSpinnerText() {
  // Combina el texto de progreso con el estado (error/advertencia)
  spinner.text = `${currentProgressText}${currentStatusText}`;
}

export const logger = {
  start: (text) => {
    currentProgressText = text;
    currentStatusText = '';
    _updateSpinnerText();
    spinner.start();
  },
  
  /**
  * Actualiza el texto de la tarea actual sin crear una nueva línea.
  * @param {string} text - El nuevo texto para el spinner.
  */
  setText: (text) => {
    currentProgressText = text;
    _updateSpinnerText();
  },
  
  /**
  * Establece o limpia un mensaje de error sin detener el spinner
  * @param {string} errorMessage - El nuevo texto para el spinner.
  */
  setError: (errorMessage) => {
    if (errorMessage) {
      currentStatusText = ` ${colors.red}| ${errorMessage}${colors.reset}`;
    } else {
      currentStatusText = '';
    }
    _updateSpinnerText();
  },
  
  /**
  * Muestra una advertencia TEMPORAL al lado del spinner.
  * Esto es lo que usaremos para los reintentos.
  * @param {string} warningMessage - El nuevo texto para el spinner.
  */
  setWarning: (warningMessage) => {
    if (warningMessage) {
      currentStatusText = ` ${colors.yellow}| ${warningMessage}${colors.reset}`;
    } else {
      currentStatusText = '';
    }
    _updateSpinnerText();
  },
  
  /**
  * Marca la tarea actual como exitosa usando el emoji '✅'.
  * @param {string} [text] - Texto final opcional.
  */
  succeed: (text) => {
    currentProgressText = '';
    currentStatusText = '';
    spinner.stopAndPersist({ symbol: '✅', text: text });
  },
  
  /**
  * Marca la tarea actual como fallida usando el emoji '❌'.
  * Se usará solo para errores fatales que detienen todo el script.
  * @param {string} [text] - Texto final opcional.
  */
  failAndStop: (text) => {
    spinner.stopAndPersist({
      symbol: '❌',
      text: colors.red + text + colors.reset,
    });
  },
  
  /**
  * 'fail' ahora es un alias para setError para no detener el proceso
  * y mantener compatibilidad si se usa en otros sitios.
  * @param {string} [text] - Texto final opcional.
  */
  fail: (text) => {
    logger.setError(text);
  },
  
  /**
  * Imprime un mensaje de información permanente.
  * @param {string} text - El mensaje a imprimir.
  */
  info: (text) => {
    spinner.info(text);
  },
  
  /**
  * Imprime un mensaje de advertencia permanente.
  * Esta función SIEMPRE imprime en una nueva línea y detiene el spinner.
  * La mantenemos por si se necesita, pero no la usaremos para los reintentos.
  * @param {string} text - El mensaje a imprimir.
  */
  warn: (text) => {
    spinner.warn(colors.yellow + text + colors.reset);
  },
  
  /**
  * Imprime texto plano en la consola sin interactuar con el spinner.
  * @param {string} text - El texto a imprimir.
  */
  log: (text) => {
    if (spinner.isSpinning) {
      spinner.stop();
      console.log(text);
      spinner.start();
    } else {
      console.log(text);
    }
  },
  
  // --- Funciones de formato de texto ---
  query: (text) => `${colors.cyan}${text}${colors.reset}`,
  highlight: (text) => `${colors.yellow}${text}${colors.reset}`,
  magentaBold: (text) => `${colors.magenta}${colors.bold}${text}${colors.reset}`,
};