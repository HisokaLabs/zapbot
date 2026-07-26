import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 *
 * @param {string} directory
 * @param {{ exclude?: string[] }} [options] Absolute file paths to skip (e.g. an autoloader file living in the same folder).
 * @returns {Promise<string[]>}
 */
export async function findJsFiles(directory, options = {}) {
   const exclude = new Set((options.exclude ?? []).map(filePath => path.resolve(filePath)));
   /** @type {string[]} */
   const results = [];

   async function walk(dir) {
      let entries;
      try {
         entries = await readdir(dir, { withFileTypes: true });
      } catch {
         return;
      }
      for (const entry of entries) {
         const fullPath = path.join(dir, entry.name);
         if (entry.isDirectory()) {
            await walk(fullPath);
         } else if (
            entry.isFile() &&
            entry.name.endsWith('.js') &&
            !exclude.has(path.resolve(fullPath))
         ) {
            results.push(fullPath);
         }
      }
   }

   await walk(directory);
   return results.sort();
}

/**
 *
 * @param {string} directory
 * @param {{ exclude?: string[] }} [options]
 * @returns {Promise<{ filePath: string, module: any }[]>}
 */
export async function loadDefaultExports(directory, options = {}) {
   const files = await findJsFiles(directory, options);
   const loaded = [];
   for (const filePath of files) {
      const imported = await import(pathToFileURL(filePath).href);
      loaded.push({ filePath, module: imported.default });
   }
   return loaded;
}
