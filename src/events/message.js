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
      /**
       * @param {import('#types').MessageContext} messageContext
       * @returns {Promise<{ type: string, command?: string }>}
       */
      async function processMessage(messageContext) {
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
               };
               ctx.events.emit('messageCreate', messageContext);
               ctx.events.emit('message', messageContext);
               ctx.events.emit('command', commandContext);
               await ctx.commands.dispatch(commandContext);

               return { type: 'command', command: trigger.command };
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

                  return { type: 'pending', command: pending.command };
               }

               // Wrong input voids the pending command; the message then
               // flows through normal processing below.
               ctx.pending.clear(chatJid, senderJid);
            }
         }

         // 3) Normal processing.
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
