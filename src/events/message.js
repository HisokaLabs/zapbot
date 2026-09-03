import { matchPrefix, parseCommand } from '#utils/helper.js';

/**
 *
 * @type {import('#types').BotEventModule}
 */
export default {
   name: 'message',

   /** @param {import('#types').BotContext} ctx */
   register(ctx) {
      /**
       * @param {import('#types').MessageContext} messageContext
       * @returns {Promise<{ type: 'command', command: string } | { type: 'message' }>}
       */
      async function processMessage(messageContext) {
         const { chatJid, senderJid, fromMe, text } = messageContext;

         if (!fromMe && text) {
            const prefix = matchPrefix(text, ctx.config.getPrefixes());
            if (prefix) {
               ctx.pending.clear(chatJid, senderJid);

               const { command, args, rest } = parseCommand(text, prefix);
               if (command && ctx.commands.has(command)) {
                  const commandContext = { ...messageContext, prefix, command, args, rest };
                  ctx.events.emit('messageCreate', messageContext);
                  ctx.events.emit('message', messageContext);
                  ctx.events.emit('command', commandContext);
                  await ctx.commands.dispatch(commandContext);
                  return { type: 'command', command };
               }
            }

            const trigger = ctx.commands.matchTrigger(text);
            if (trigger) {
               ctx.pending.clear(chatJid, senderJid);

               const commandContext = {
                  ...messageContext,
                  prefix: trigger.symbol,
                  command: trigger.command,
                  args: trigger.args,
                  rest: trigger.rest,
               };
               ctx.events.emit('messageCreate', messageContext);
               ctx.events.emit('message', messageContext);
               ctx.events.emit('command', commandContext);
               await ctx.commands.dispatch(commandContext);

               return { type: 'command', command: trigger.command };
            }
         }

         ctx.events.emit('messageCreate', messageContext);
         ctx.events.emit('message', messageContext);

         return { type: 'message' };
      }

      ctx.events.on(
         'raw_message',
         async (/** @type {import('zapo-js').WaIncomingMessageEvent} */ event) => {
            const messageContext = ctx.utils.parseMessage(event, ctx);

            try {
               await ctx.middleware.execute(messageContext, () => processMessage(messageContext));
            } catch (error) {
               ctx.events.emit('error', error);
            }
         },
      );
   },
};
