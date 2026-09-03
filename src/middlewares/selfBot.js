import { isSelfBotAllowed } from '#utils/selfBot.js';

/**
 * Self-bot gate middleware.
 *
 * @type {import('#types').Middleware}
 */
export default async function selfBotGuard(message, next) {
   if (!config('selfBot.enabled', false)) return await next();

   if (isSelfBotAllowed(message)) return await next();

   // Not allowed: stop the chain by not calling next(). No error, no reply.
}
