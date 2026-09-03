import configData from '#config/index.js';
import { Bot } from '#core/Bot.js';
import selfBotGuard from '#middlewares/selfBot.js';
import { blockGuard, shoutTransform, timingLifecycle } from '#middlewares/testing.js';

const bot = new Bot(configData);

bot.use(selfBotGuard);

// Testing middlewares (debugging purposes)
bot.use(blockGuard);
bot.use(shoutTransform);
bot.use(timingLifecycle);

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
