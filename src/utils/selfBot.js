import { isDeveloper, normalizeNumber } from '#utils/developer.js';

/**
 *
 * @param {import('#types').BotContext} ctx
 * @returns {string}
 */
export function getSelfNumber(ctx) {
   try {
      const credentials = ctx.client.getCredentials();
      return normalizeNumber(credentials?.meJid ?? '');
   } catch {
      return '';
   }
}

/**
 *
 * @param {import('#types').BotContext} ctx
 * @param {string} senderJid
 * @param {boolean} fromMe
 * @returns {boolean}
 */
export function isSelf(ctx, senderJid, fromMe) {
   if (fromMe) return true;
   const selfNumber = getSelfNumber(ctx);
   if (!selfNumber) return false;
   return normalizeNumber(senderJid) === selfNumber;
}

/**
 *
 * @param {import('#types').MessageContext} message
 * @returns {boolean}
 */
export function isSelfBotAllowed(message) {
   const { ctx, senderJid, fromMe } = message;
   return isSelf(ctx, senderJid, fromMe) || isDeveloper(ctx, senderJid);
}
