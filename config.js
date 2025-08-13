// config.js

// Objeto para ajustes dinámicos del script.
export const SCRIPT_SETTINGS = {
  VERBOSE_MODE: false, // Por defecto, el modo verbose está desactivado.
};

export const API_CONFIG = {
  RETRY_DELAY_MS: 30000,
  MAX_RETRY_SECONDS: 120,
  REQUEST_INTERVAL_MS: 5000,
};

export const CONSOLE_COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};