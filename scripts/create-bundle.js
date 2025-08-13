// Ruta: scripts/create-bundle.js
// Justificación: Este script automatiza la creación de un "bundle" de texto plano
// de toda la base de código. Es una herramienta de análisis útil que permite
// ver todo el proyecto en un solo fichero, con opciones para limpiar el código
// eliminando imports y comentarios, facilitando su estudio o procesamiento.

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import ignore from 'ignore';

const ROOT_DIR = process.cwd();
const GITIGNORE_PATH = path.join(ROOT_DIR, '.gitignore');
const OUTPUT_FILE = path.join(ROOT_DIR, 'bundle.txt');

// Justificación: Exclusiones de seguridad para asegurar que nunca se incluyan
// directorios sensibles o el propio fichero de salida en el bundle.
const HARDCODED_EXCLUSIONS = [
  'node_modules/**', 
  '.git/**', 
  'bundle.txt', 
  'static/**'
];

// Justificación: Campo personalizable para añadir ficheros o patrones glob
// que se deseen excluir del bundle, como ficheros de lock o configuración.
const CUSTOM_EXCLUSIONS = [
  '**/*.css',
  'package-lock.json', 
  '.env.example', 
  '.gitignore',
  'README.md',
  'scripts/create-bundle.js',
  'prisma/dev.db',
  'prisma/test.db',
  '**/__pycache__/**'
];

/**
* Procesa el contenido de un fichero de código según el modo especificado.
* @param {string} content - El contenido del fichero.
* @param {'full' | 'no-imports' | 'no-comments' | 'minified'} mode - El modo de procesamiento.
* @returns {string} El contenido procesado.
*/
function processContent(content, mode) {
  let processedContent = content;
  
  if (mode === 'no-imports' || mode === 'no-comments' || mode === 'minified') {
    // Justificación: Expresión regular para eliminar líneas de import.
    // Es multilínea (m) para que `^` coincida con el inicio de cada línea.
    processedContent = processedContent.replace(/^import.*?;?$/gm, '');
  }
  
  if (mode === 'no-comments' || mode === 'minified') {
    // Justificación: Expresiones regulares para eliminar comentarios de una línea y de bloque.
    processedContent = processedContent.replace(/\/\/.*/g, ''); // Comentarios de una línea
    processedContent = processedContent.replace(/\/\*[\s\S]*?\*\//g, ''); // Comentarios de bloque
  }
  
  processedContent = processedContent
  .replace(/\s+/g, ' ')   // colapsa espacios, tabs y saltos
  .trim();
  
  // Eliminar líneas vacías múltiples para un resultado más limpio.
  return processedContent.replace(/^\s*[\r\n]/gm, '').trim();
}

function showHelp() {
  console.log(`
Uso: node scripts/create-bundle.js [opciones]
		
Este script crea un fichero 'bundle.txt' con todo el código fuente del proyecto,
respetando las reglas de .gitignore y exclusiones personalizadas.
		
Opciones:
  --mode=<modo>    Define el nivel de procesamiento del código.
                   Modos disponibles:
                     - full: (Por defecto) Incluye todo el código fuente tal cual.
                     - no-imports: Excluye las líneas de importación de módulos.
                     - no-comments: Excluye imports y todo tipo de comentarios.
		
  -h, --help       Muestra este mensaje de ayuda.
		
Ejemplos:
  node scripts/create-bundle.js
  node scripts/create-bundle.js --mode=no-imports
  node scripts/create-bundle.js --mode=no-comments
	`);
  }
  
  async function createBundle() {
    // --- 1. Parsear argumentos de la línea de comandos ---
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
      showHelp();
      return;
    }
    
    console.log('Iniciando la creación del bundle de código...');
    
    const modeArg = args.find((arg) => arg.startsWith('--mode='));
    const mode = modeArg ? modeArg.split('=')[1] : 'no-comments';
    
    if (!['full', 'no-imports', 'no-comments'].includes(mode)) {
      console.error(
        `Modo inválido: "${mode}". Los modos válidos son: full, no-imports, no-comments.`
      );
      process.exit(1);
    }
    console.log(`Modo seleccionado: ${mode}`);
    
    try {
      // --- 2. Leer .gitignore y preparar el filtro ---
      const gitignoreContent = await fs.readFile(GITIGNORE_PATH, 'utf-8');
      const ig = ignore()
      .add(gitignoreContent)
      .add(HARDCODED_EXCLUSIONS.join('\n'))
      .add(CUSTOM_EXCLUSIONS.join('\n'));
      
      // --- 3. Encontrar todos los ficheros y filtrarlos ---
      const allFiles = await glob('**/*', { nodir: true, dot: true, cwd: ROOT_DIR });
      const filteredFiles = allFiles.filter((file) => !ig.ignores(file));
      console.log(`Se encontraron ${filteredFiles.length} ficheros para incluir en el bundle.`);
      
      // --- 4. Procesar cada fichero y construir el bundle ---
      let bundleContent = `/* --- Bundle de Código Generado ---
 * Modo: ${mode}
 * Ficheros Incluidos: ${filteredFiles.length}
 * Fecha: ${new Date().toISOString()}
 */\n\n`;
      
      for (const file of filteredFiles) {
        const filePath = path.join(ROOT_DIR, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const processed = processContent(content, mode);
          
          if (processed) {
            bundleContent += `// --- Ruta: ${file} ---\n`;
            bundleContent += processed;
            bundleContent += '\n\n';
          }
        } catch (error) {
          // Ignorar errores de lectura (ej. ficheros binarios)
          if (error.code !== 'ENOENT') {
            console.warn(`- Omitiendo fichero (no es texto plano): ${file}`);
          }
        }
      }
      
      // --- 5. Escribir el fichero final ---
      await fs.writeFile(OUTPUT_FILE, bundleContent);
      console.log(`\n¡Éxito! El bundle ha sido creado en: ${OUTPUT_FILE}`);
    } catch (error) {
      console.error('\nOcurrió un error durante la creación del bundle:', error);
      process.exit(1);
    }
  }
  
  createBundle();
  