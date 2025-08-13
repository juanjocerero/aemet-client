// utils/consoleLogger.js

import ora from 'ora';
import { CONSOLE_COLORS as colors } from '../config.js';

// Creamos una única instancia del spinner que gestionaremos en este módulo.
const spinner = ora({
  color: 'cyan',
});

export const logger = {
  /**
   * Inicia una nueva tarea con un spinner.
   * @param {string} text - El texto inicial para la tarea.
   */
  start: (text) => {
    spinner.start(text);
  },

  /**
   * Actualiza el texto de la tarea actual sin crear una nueva línea.
   * @param {string} text - El nuevo texto para el spinner.
   */
  setText: (text) => {
    spinner.text = text;
  },
  
  /**
   * Marca la tarea actual como exitosa usando el emoji '✅'.
   * @param {string} [text] - Texto final opcional.
   */
  succeed: (text) => {
    spinner.stopAndPersist({
      symbol: '✅',
      text: text,
    });
  },

  /**
   * Marca la tarea actual como fallida usando el emoji '❌'.
   * @param {string} [text] - Texto final opcional.
   */
  fail: (text) => {
    spinner.stopAndPersist({
      symbol: '❌',
      text: colors.red + text + colors.reset,
    });
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
    // Si el spinner está activo, lo detenemos para no sobreescribir la línea.
    if (spinner.isSpinning) {
      spinner.stop();
    }
    console.log(text);
  },
  
  // --- Funciones de formato de texto ---
  query: (text) => `${colors.cyan}${text}${colors.reset}`,
  highlight: (text) => `${colors.yellow}${text}${colors.reset}`,
  magentaBold: (text) => `${colors.magenta}${colors.bold}${text}${colors.reset}`,
};