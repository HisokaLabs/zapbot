/**
 *
 * @type {import('#types').BotEventModule}
 */
export default {
   name: 'connection',

   /** @param {import('#types').BotContext} ctx */
   register(ctx) {
      ctx.events.on('connection', (/** @type {import('zapo-js').WaConnectionEvent} */ event) => {
         if (event.status === 'open') {
            ctx.logger.success(`Connected (new login: ${event.isNewLogin})`);
         } else {
            ctx.logger.warn(`Disconnected: ${event.reason ?? 'unknown reason'}`, event);
         }
      });

      ctx.events.on('ready', () => {
         ctx.logger.success(`Bot is ready — ${ctx.plugins.count()} plugin(s) loaded.`);
      });
   },
};
