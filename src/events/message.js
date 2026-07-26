import { matchPrefix, parseCommand } from '#utils/helper.js';

/**
 *
 * @type {import('#types').BotEventModule}
 */
export default {
   name: 'message',

   /** @param {import('#types').BotContext} ctx */
   register(ctx) {
      ctx.events.on(
         'raw_message',
         async (/** @type {import('zapo-js').WaIncomingMessageEvent} */ event) => {
            const messageContext = ctx.utils.parseMessage(event, ctx);

            try {
               await ctx.middleware.execute(messageContext);
            } catch (error) {
               ctx.events.emit('error', error);
               return;
            }

            ctx.events.emit('messageCreate', messageContext);
            ctx.events.emit('message', messageContext);

            if (messageContext.fromMe || !messageContext.text) return;

            const prefixes = ctx.config.getPrefixes();
            const prefix = matchPrefix(messageContext.text, prefixes);
            if (!prefix) return;

            const { command, args } = parseCommand(messageContext.text, prefix);
            if (!command || !ctx.commands.has(command)) return;

            const commandContext = { ...messageContext, prefix, command, args };
            ctx.events.emit('command', commandContext);
            await ctx.commands.dispatch(commandContext);
         },
      );
   },
};
