import { matchPrefix, parseCommand } from '#utils/helper.js';

/**
 * @param {import('#types').MessageContext} message
 * @param {import('#types').MessageKind[]} expectedInput
 * @returns {boolean}
 */
function matchesExpectedInput(message, expectedInput) {
   const kinds = new Set(expectedInput);
   if (kinds.has(message.type)) return true;
   return Boolean(message.quoted && kinds.has(message.quoted.type));
}

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

            const { chatJid, senderJid, fromMe, text } = messageContext;

            if (!fromMe && text) {
               const prefix = matchPrefix(text, ctx.config.getPrefixes());
               if (prefix) {
                  ctx.pending.clear(chatJid, senderJid);

                  const { command, args } = parseCommand(text, prefix);
                  if (command && ctx.commands.has(command)) {
                     const commandContext = { ...messageContext, prefix, command, args };
                     ctx.events.emit('messageCreate', messageContext);
                     ctx.events.emit('message', messageContext);
                     ctx.events.emit('command', commandContext);
                     await ctx.commands.dispatch(commandContext);
                     return;
                  }
               }
            }

            if (!fromMe) {
               const pending = ctx.pending.get(chatJid, senderJid);
               if (pending) {
                  if (matchesExpectedInput(messageContext, pending.expectedInput)) {
                     ctx.pending.consume(chatJid, senderJid);

                     const commandContext = {
                        ...messageContext,
                        ...(pending.data ?? {}),
                        prefix: pending.prefix ?? '',
                        command: pending.command,
                        args: pending.args ?? [],
                     };

                     try {
                        await ctx.commands.dispatch(commandContext);
                     } finally {
                        ctx.pending.clear(chatJid, senderJid);
                     }
                     return;
                  }

                  // Wrong input voids the pending command; the message then
                  // flows through normal processing below.
                  ctx.pending.clear(chatJid, senderJid);
               }
            }

            // 3) Normal processing.
            ctx.events.emit('messageCreate', messageContext);
            ctx.events.emit('message', messageContext);
         },
      );
   },
};
