/** @typedef {import('#types').BotPlugin} BotPlugin */
/** @typedef {import('#types').CommandContext} CommandContext */

export class CommandManager {
   /** @param {import('#core/Logger.js').Logger} logger */
   constructor(logger) {
      this.logger = logger.child({ scope: 'CommandManager' });
      /** @type {Map<string, BotPlugin>} */
      this.commands = new Map();
      /** @type {Map<string, string>} */
      this.triggers = new Map();
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

      const commandSet = new Set(plugin.commands.map(name => name.toLowerCase()));
      for (const name of plugin.commands) {
         const key = name.toLowerCase();
         if (this.commands.has(key)) {
            this.logger.warn(
               `Command "${key}" is already registered by "${this.commands.get(key)?.name}" — "${plugin.name}" overrides it.`,
            );
         }
         this.commands.set(key, plugin);
      }

      if (plugin.triggers && typeof plugin.triggers === 'object') {
         for (const [symbol, commandName] of Object.entries(plugin.triggers)) {
            const command = String(commandName).toLowerCase();
            if (!commandSet.has(command)) {
               this.logger.warn(
                  `Plugin "${plugin.name}" declares trigger "${symbol}" -> "${commandName}" but has no such command — skipped.`,
               );
               continue;
            }
            if (this.triggers.has(symbol)) {
               this.logger.warn(
                  `Trigger "${symbol}" is already claimed by "${this.triggers.get(symbol)}" — "${plugin.name}" ignored.`,
               );
               continue;
            }
            this.triggers.set(symbol, command);
         }
      }
   }

   /** @param {string} command */
   has(command) {
      return this.commands.has(command.toLowerCase());
   }

   /**
    * @param {string} text
    * @returns {{ symbol: string, command: string, args: string[] } | undefined}
    */
   matchTrigger(text) {
      for (const [symbol, command] of this.triggers) {
         if (text.startsWith(symbol)) {
            const argsText = text.slice(symbol.length).trim();
            return {
               symbol,
               command,
               args: argsText.length ? argsText.split(/\s+/) : [],
            };
         }
      }
      return undefined;
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
