import { EventEmitter } from 'node:events';

/** @typedef {import('#types').BotConfig} BotConfig */

export class ConfigManager extends EventEmitter {
   /** @param {BotConfig} initialConfig */
   constructor(initialConfig) {
      super();
      /** @type {BotConfig} */
      this.data = structuredClone(initialConfig);
   }

   /** @param {string} path */
   segments(path) {
      return path.split('.').filter(Boolean);
   }

   /**
    * @template T
    * @param {string} path
    * @param {T} [fallback]
    * @returns {T}
    */
   get(path, fallback) {
      const segments = this.segments(path);
      /** @type {unknown} */
      let cursor = this.data;
      for (const segment of segments) {
         if (cursor == null || typeof cursor !== 'object') return /** @type {T} */ (fallback);
         cursor = /** @type {Record<string, unknown>} */ (cursor)[segment];
      }
      return cursor === undefined ? /** @type {T} */ (fallback) : /** @type {T} */ (cursor);
   }

   /**
    * @param {string} path
    * @param {unknown} value
    */
   set(path, value) {
      const segments = this.segments(path);
      const last = segments.pop();
      if (!last) throw new Error(`ConfigManager.set: invalid path "${path}"`);

      /** @type {Record<string, unknown>} */
      let cursor = /** @type {any} */ (this.data);
      for (const segment of segments) {
         if (typeof cursor[segment] !== 'object' || cursor[segment] === null) {
            cursor[segment] = {};
         }
         cursor = /** @type {Record<string, unknown>} */ (cursor[segment]);
      }
      cursor[last] = value;
      this.emit('change', { path, value });
   }

   /** @returns {string[]} */
   getPrefixes() {
      const prefix = this.get('prefix', ['.']);
      return Array.isArray(prefix) ? prefix : [String(prefix)];
   }

   /** @returns {BotConfig} */
   getAll() {
      return this.data;
   }
}

export default ConfigManager;
