import { Bot } from '#core/Bot.js';
import selfBotMiddleware from '#middlewares/selfBot.js';

import config from '#config';

const bot = new Bot(config);

bot.use(selfBotMiddleware);

process.on('SIGINT', async () => {
   bot.logger.warn('Shutting down (SIGINT)...');
   await bot.stop();
   process.exit(0);
});

process.on('SIGTERM', async () => {
   bot.logger.warn('Shutting down (SIGTERM)...');
   await bot.stop();
   process.exit(0);
});

bot.start().catch(error => {
   bot.logger.error('Fatal error while starting the bot', {
      error: error instanceof Error ? error.message : String(error),
   });
   process.exit(1);
});
