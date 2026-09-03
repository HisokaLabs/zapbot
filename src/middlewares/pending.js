import { matchPrefix } from '#utils/helper.js';

/** @typedef {import('#types').MessageContext} MessageContext */
/** @typedef {import('#types').MessageKind} MessageKind */

/**
 * @param {MessageContext} message
 * @param {MessageKind[]} expectedInput
 * @returns {boolean}
 */
function matchesExpectedInput(message, expectedInput) {
   const kinds = new Set(expectedInput);
   if (kinds.has(message.type)) return true;
   return Boolean(message.quoted && kinds.has(message.quoted.type));
}

/**
 * @type {import('#types').Middleware}
 */
export default async function pendingCommand(message, next) {
   const { ctx, chatJid, senderJid, fromMe, text = '' } = message;

   if (fromMe) return await next();

   if (matchPrefix(text, ctx.config.getPrefixes()) || ctx.commands.matchTrigger(text)) {
      return await next();
   }

   const pending = ctx.pending.get(chatJid, senderJid);
   if (!pending) return await next();

   if (!matchesExpectedInput(message, pending.expectedInput)) {
      ctx.pending.clear(chatJid, senderJid);
      return await next();
   }

   ctx.pending.consume(chatJid, senderJid);

   if (pending.data && typeof pending.data === 'object') {
      Object.assign(message, pending.data);
   }

   const prefix = pending.prefix || ctx.config.getPrefixes()[0] || '';
   const argsText = pending.args.length ? ` ${pending.args.join(' ')}` : '';
   const followUpText = text.trim() ? ` ${text.trim()}` : '';
   message.text = `${prefix}${pending.command}${argsText}${followUpText}`;

   return await next();
}
