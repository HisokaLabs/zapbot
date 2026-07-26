import { isGroupJid } from 'zapo-js';

import {
   extractText,
   getMessageKind,
   hasMedia,
   getMediaMimetype,
   getMediaDurationSeconds,
   getQuotedMessage,
   getMentionedJids,
} from '#utils/media.js';

/**
 *
 * @param {import('zapo-js').WaIncomingMessageEvent} event
 * @param {import('#types').BotContext} ctx
 * @returns {import('#types').MessageContext}
 */
export function parseMessage(event, ctx) {
   const message = event.message;
   const chatJid = event.key.remoteJidAlt ?? event.key.remoteJid ?? '';
   const senderJid = event.key.participantAlt ?? event.key.participant ?? chatJid;
   const type = getMessageKind(message);
   const quotedMessage = getQuotedMessage(message);

   return {
      raw: event,
      ctx,
      key: event.key,
      id: event.key.id ?? '',
      chatJid,
      senderJid,
      isGroup: isGroupJid(chatJid),
      fromMe: Boolean(event.key.fromMe),
      pushName: event.pushName ?? undefined,
      text: extractText(message),
      type,
      isMedia: hasMedia(message),
      isType: kind => type === kind,
      mimetype: getMediaMimetype(message),
      seconds: getMediaDurationSeconds(message),
      quoted: quotedMessage
         ? { message: quotedMessage, type: getMessageKind(quotedMessage) }
         : undefined,
      mentions: getMentionedJids(message),
      send: (content, options) => ctx.wa.sendMessage(chatJid, content, options),
      reply: (content, options) => ctx.wa.reply(event, content, options),
   };
}

export default parseMessage;
