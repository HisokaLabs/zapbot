import path from 'node:path';

import { ClientWrapper } from '#core/ClientWrapper.js';
import { CommandManager } from '#core/CommandManager.js';
import { ConfigManager } from '#core/ConfigManager.js';
import { EventManager } from '#core/EventManager.js';
import { Logger } from '#core/Logger.js';
import { MiddlewareManager } from '#core/MiddlewareManager.js';
import { PluginManager } from '#core/PluginManager.js';
import { loadEvents } from '#events/index.js';
import * as helper from '#utils/helper.js';
import * as media from '#utils/media.js';
import { parseMessage } from '#utils/parseMessage.js';
import * as sticker from '#utils/sticker.js';

/** @typedef {import('#types').BotConfig} BotConfig */
/** @typedef {import('#types').BotContext} BotContext */
/** @typedef {import('#types').BotPlugin} BotPlugin */
/** @typedef {import('#types').BotEventModule} BotEventModule */
/** @typedef {import('#types').Middleware} Middleware */

export class Bot {
   /** @param {BotConfig} config */
   constructor(config) {
      this.config = new ConfigManager(config);
      this.logger = new Logger(this.config.get('logger.level', 'info'));
      this.events = new EventManager();
      this.middleware = new MiddlewareManager();
      this.commands = new CommandManager(this.logger);
      this.wa = new ClientWrapper({
         config: this.config,
         logger: this.logger,
         events: this.events,
      });

      const pluginDirectory = path.resolve(
         process.cwd(),
         this.config.get('plugins.directory', './src/plugins'),
      );
      this.plugins = new PluginManager({
         directory: pluginDirectory,
         commands: this.commands,
         logger: this.logger,
         buildContext: () => this.buildContext(),
      });

      /** @type {BotContext | undefined} */
      this.context = undefined;
   }

   /**
    *
    * @param {Middleware} middleware
    */
   use(middleware) {
      this.middleware.use(middleware);
   }

   /**
    *
    * @returns {BotContext}
    */
   buildContext() {
      if (this.context) return this.context;

      /** @type {BotContext} */
      const ctx = {
         client: this.wa.client,
         wa: this.wa,
         config: this.config,
         logger: this.logger,
         plugins: this.plugins,
         commands: this.commands,
         events: this.events,
         middleware: this.middleware,
         utils: { helper, media, sticker, parseMessage },
         sendMessage: (jid, content, options) => this.wa.sendMessage(jid, content, options),
         registerCommand: plugin => this.commands.register(plugin),
         registerEvent: eventModule => eventModule.register(ctx),
         downloadMedia: (event, filePath) =>
            filePath ? this.wa.downloadToFile(event, filePath) : this.wa.downloadBytes(event),
      };

      this.context = ctx;
      return ctx;
   }

   async start() {
      const ctx = this.buildContext();

      await loadEvents(ctx);
      await this.plugins.load();

      this.logger.info(`Command prefixes: ${this.config.getPrefixes().join(' ')}`);
      this.logger.info(
         `Registered commands: ${
            this.commands
               .list()
               .map(c => c.command)
               .join(', ') || '(none)'
         }`,
      );

      ctx.events.on('error', error => {
         this.logger.error('Unhandled bot error', {
            error: error instanceof Error ? error.message : String(error),
         });
      });

      await this.wa.connect();
   }

   async stop() {
      await this.wa.disconnect();
   }
}

export default Bot;
