/** @typedef {import('#types').BotPlugin} BotPlugin */
/** @typedef {import('#types').CommandContext} CommandContext */

export class CommandManager {
   /** @param {import('#core/Logger.js').Logger} logger */
   constructor(logger) {
      this.logger = logger.child({ scope: 'CommandManager' });
      /** @type {Map<string, BotPlugin>} */
      this.commands = new Map();
   }

   /** @param {BotPlugin} plugin */
   register(plugin) {
      if (plugin.type !== 'command') return;
      if (!plugin.commands?.length) {
         this.logger.warn(
            `Plugin "${plugin.name}" is type "command" but declares no commands[] — skipped.`,
         );
         return;
      }

      if (typeof plugin.execute !== 'function') {
         this.logger.warn(
            `Plugin "${plugin.name}" is type "command" but has no execute() — skipped.`,
         );
         return;
      }

      for (const name of plugin.commands) {
         const key = name.toLowerCase();
         if (this.commands.has(key)) {
            this.logger.warn(
               `Command "${key}" is already registered by "${this.commands.get(key)?.name}" — "${plugin.name}" overrides it.`,
            );
         }
         this.commands.set(key, plugin);
      }
   }

   /** @param {string} command */
   has(command) {
      return this.commands.has(command.toLowerCase());
   }

   list() {
      return [...this.commands.entries()].map(([command, plugin]) => ({ command, plugin }));
   }

   /**
    * @param {CommandContext} command
    * @returns {Promise<boolean>} whether a plugin handled the command
    */
   async dispatch(command) {
      const plugin = this.commands.get(command.command.toLowerCase());
      if (!plugin?.execute) return false;

      try {
         await plugin.execute(command);
      } catch (error) {
         this.logger.error(`Plugin "${plugin.name}" threw while executing "${command.command}"`, {
            error: error instanceof Error ? error.message : String(error),
         });
      }
      return true;
   }
}

export default CommandManager;
