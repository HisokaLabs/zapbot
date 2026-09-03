import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} directory Absolute path to the config directory.
 * @param {string[]} [ignore] Basenames to skip (e.g. the entry file itself).
 * @returns {Promise<Record<string, unknown>>}
 */
export async function loadConfigFiles(directory, ignore = ['index.js']) {
   const skip = new Set(ignore);
   const entries = await readdir(directory, { withFileTypes: true });
   /** @type {Record<string, unknown>} */
   const config = {};
   for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.js') || skip.has(entry.name)) continue;
      const key = entry.name.slice(0, -3);
      const module = await import(pathToFileURL(path.join(directory, entry.name)).href);
      config[key] = module.default;
   }
   return config;
}

/**
 * @type {Record<string, unknown>}
 */
const data = await loadConfigFiles(directory);

/**
 * @param {string} key Dot-separated path to the config value.
 * @param {unknown} [fallback] Returned when the path is missing.
 * @returns {unknown}
 */
export function config(key, fallback) {
   const segments = key.split('.').filter(Boolean);
   /** @type {unknown} */
   let cursor = data;
   for (const segment of segments) {
      if (cursor == null || typeof cursor !== 'object') return fallback;
      cursor = /** @type {Record<string, unknown>} */ (cursor)[segment];
   }
   return cursor === undefined ? fallback : cursor;
}

// Make config helpers available globally.
globalThis.config = config;

export default data;
