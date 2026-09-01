import { isSelfBotAllowed } from '#utils/selfBot.js';

/**
 * Self-bot gate middleware.
 *
 * @type {import('#types').Middleware}
 */
export default async function selfBotMiddleware(message, next) {
   if (!message.ctx.config.get('selfBot.enabled', false)) return next();

   if (isSelfBotAllowed(message)) return next();

   throw new Error('Self-bot is not allowed in this context.');
}
