/** @typedef {import('zapo-js').Proto.IMessage} IMessage */
/** @typedef {import('#types').MessageKind} MessageKind */

import { getContentType } from 'zapo-js';

/**
 *
 * @param {IMessage | null | undefined} message
 * @returns {string}
 */
export function extractText(message) {
   if (!message) return '';
   const contentType = getContentType(message);

   return (
      message.conversation ??
      message.extendedTextMessage?.text ??
      message?.[contentType]?.caption ??
      ''
   );
}

/**
 *
 * @param {IMessage | null | undefined} message
 * @returns {MessageKind}
 */
export function getMessageKind(message) {
   if (!message) return 'unknown';
   if (message.conversation || message.extendedTextMessage) return 'text';
   if (message.imageMessage) return 'image';
   if (message.videoMessage) return message.videoMessage.gifPlayback ? 'gif' : 'video';
   if (message.audioMessage) return message.audioMessage.ptt ? 'ptt' : 'audio';
   if (message.documentMessage || message.documentWithCaptionMessage) return 'document';
   if (message.stickerMessage) return 'sticker';
   if (message.pollCreationMessage) return 'poll';
   if (message.locationMessage) return 'location';
   if (message.contactMessage || message.contactsArrayMessage) return 'contact';
   if (message.liveLocationMessage) return 'live_location';
   if (message.groupInviteMessage) return 'group_invite';
   if (message.stickerPackMessage) return 'sticker_pack';
   if (message.callLogMessage) return 'call_log';
   if (message.reactionMessage) return 'reaction';
   if (message.editedMessage) return 'edited';
   if (message.viewOnceMessage || message.viewOnceMessageV2) return 'view_once';
   if (message.albumMessage) return 'album';
   if (message.templateMessage) return 'template';
   return 'unknown';
}

/**
 *
 * @param {IMessage | null | undefined} message
 * @returns {boolean}
 */
export function hasMedia(message) {
   return ['image', 'video', 'gif', 'audio', 'ptt', 'document', 'sticker'].includes(
      getMessageKind(message),
   );
}

/**
 *
 * @param {IMessage | null | undefined} message
 * @returns {number | undefined}
 */
export function getMediaDurationSeconds(message) {
   const seconds = message?.videoMessage?.seconds ?? message?.audioMessage?.seconds;
   return typeof seconds === 'number' ? seconds : undefined;
}

/**
 *
 * @param {IMessage | null | undefined} message
 * @returns {string | undefined}
 */
export function getMediaMimetype(message) {
   const contentType = getContentType(message);
   return message?.[contentType]?.mimetype ?? undefined;
}

/**
 *
 * @param {IMessage | null | undefined} message
 * @returns {boolean}
 */
export function isAnimatedSticker(message) {
   return Boolean(message?.stickerMessage?.isAnimated);
}

/**
 *
 * @param {IMessage | null | undefined} message
 * @returns {import('zapo-js').Proto.IContextInfo | undefined}
 */
export function getContextInfo(message) {
   const contentType = getContentType(message);
   return message?.[contentType]?.contextInfo ?? undefined;
}

/**
 *
 * @param {IMessage | null | undefined} message
 * @returns {IMessage | undefined}
 */
export function getQuotedMessage(message) {
   return getContextInfo(message)?.quotedMessage ?? undefined;
}

/**
 *
 * @param {IMessage | null | undefined} message
 * @returns {string[]}
 */
export function getMentionedJids(message) {
   return /** @type {string[]} */ (getContextInfo(message)?.mentionedJid ?? []);
}
