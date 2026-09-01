/**
 * @param {string} value
 * @returns {string}
 */
export function normalizeNumber(value) {
   if (!value) return '';
   // Strip the `@server` suffix and any `:device` segment, then keep digits only.
   const base = String(value).split('@')[0].split(':')[0];
   return base.replace(/\D/g, '');
}

/**
 * @param {import('#types').BotContext} ctx
 * @returns {string[]} normalized bare-digit developer numbers
 */
export function getDeveloperNumbers(ctx) {
   const raw = ctx.config.get('developer.numbers', []);
   const list = Array.isArray(raw) ? raw : [raw];
   return list.map(normalizeNumber).filter(Boolean);
}

/**
 * @param {import('#types').BotContext} ctx
 * @param {string} senderJid
 * @returns {boolean}
 */
export function isDeveloper(ctx, senderJid) {
   const target = normalizeNumber(senderJid);
   if (!target) return false;
   return getDeveloperNumbers(ctx).includes(target);
}
