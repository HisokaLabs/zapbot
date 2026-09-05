import { isSelfBotAllowed } from '#utils/selfBot.js';

/**
 * Self-bot gate middleware.
 *
 * @type {import('#types').Middleware}
 */
export default async function selfBotGuard(message, next) {
   const enabled = message.ctx.selfBotEnabled ?? config('selfBot.enabled', false);

   if (!enabled) return await next();

   if (isSelfBotAllowed(message)) return await next();

   // Not allowed: stop the chain by not calling next(). No error, no reply.
}
