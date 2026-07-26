import path from 'node:path';

import { loadDefaultExports } from '#utils/loader.js';

/** @typedef {import('#types').BotPlugin} BotPlugin */
/** @typedef {import('#types').LoadedPlugin} LoadedPlugin */
/** @typedef {import('#types').BotContext} BotContext */

export class PluginManager {
   /**
    * @param {{ directory: string, commands: import('#core/CommandManager.js').CommandManager, logger: import('#core/Logger.js').Logger, buildContext: () => BotContext }} options
    */
   constructor({ directory, commands, logger, buildContext }) {
      this.directory = directory;
      this.commands = commands;
      this.logger = logger.child({ scope: 'PluginManager' });
      this.buildContext = buildContext;
      /** @type {Map<string, LoadedPlugin>} */
      this.loaded = new Map();
   }

   async load() {
      const files = await loadDefaultExports(this.directory);
      for (const { filePath, module: plugin } of files) {
         await this.registerPlugin(plugin, filePath);
      }
      this.logger.success(`Loaded ${this.loaded.size} plugin(s) from ${this.directory}`);
   }

   /**
    * @param {BotPlugin} plugin
    * @param {string} filePath
    */
   async registerPlugin(plugin, filePath) {
      if (!plugin?.name || typeof plugin.init !== 'function') {
         this.logger.warn(
            `Skipping ${filePath} — does not default-export a valid BotPlugin (missing name/init).`,
         );
         return;
      }

      if (plugin.enabled === false) {
         this.logger.info(`Skipping disabled plugin "${plugin.name}"`);
         return;
      }

      if (
         plugin.type === 'command' &&
         (!plugin.commands?.length || typeof plugin.execute !== 'function')
      ) {
         this.logger.warn(
            `Plugin "${plugin.name}" is type "command" but is missing commands[] or execute() — skipped.`,
         );
         return;
      }

      const category =
         path.relative(this.directory, path.dirname(filePath)).split(path.sep).join('/') ||
         'general';
      const ctx = this.buildContext();

      try {
         await plugin.init(ctx);
      } catch (error) {
         this.logger.error(`Plugin "${plugin.name}" threw during init()`, {
            error: error instanceof Error ? error.message : String(error),
         });
         return;
      }

      if (plugin.type === 'command') {
         this.commands.register(plugin);
      }

      this.loaded.set(plugin.name, { plugin, category, filePath });
      this.logger.info(`Plugin loaded: ${plugin.name} (${plugin.type}) [${category}]`);
   }

   /** @returns {LoadedPlugin[]} */
   list() {
      return [...this.loaded.values()];
   }

   /** @param {string} name */
   get(name) {
      return this.loaded.get(name);
   }

   count() {
      return this.loaded.size;
   }
}

export default PluginManager;
