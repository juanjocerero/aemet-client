// utils/consoleLogger.js
import { CONSOLE_COLORS as colors } from '../config.js';

export const logger = {
  info: (message) => console.log(message),
  success: (message) => console.log(`${colors.green}${message}${colors.reset}`),
  warn: (message) => console.log(`${colors.yellow}${message}${colors.reset}`),
  error: (message) => console.error(`${colors.red}${message}${colors.reset}`),
  highlight: (message) => `${colors.yellow}${message}${colors.reset}`,
  cyan: (message) => `${colors.cyan}${message}${colors.reset}`,
  magentaBold: (message) => `${colors.magenta}${colors.bold}${message}${colors.reset}`,
  logProgress: (current, total, stationId, dateRange) => {
    console.log(`\n${colors.cyan}[${current}/${total} (${stationId})]${colors.reset} Procesando rango ${colors.yellow}${dateRange}${colors.reset}`);
  },
};