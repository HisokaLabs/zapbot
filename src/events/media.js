import { getMediaMimetype, getMediaDurationSeconds } from '#utils/media.js';

/**
 *
 * @type {import('#types').BotEventModule}
 */
export default {
   name: 'media',

   /** @param {import('#types').BotContext} ctx */
   register(ctx) {
      ctx.events.on(
         'messageCreate',
         (/** @type {import('#types').MessageContext} */ messageContext) => {
            if (!messageContext.isMedia) return;

            const message = messageContext.raw.message;

            /** @type {import('#types').MediaContext} */
            const mediaContext = {
               raw: messageContext.raw,
               ctx,
               type: /** @type {import('#types').MediaContext['type']} */ (
                  messageContext.type === 'ptt' ? 'audio' : messageContext.type
               ),
               mimetype: getMediaMimetype(message),
               seconds: getMediaDurationSeconds(message),
               caption: messageContext.text || undefined,
               downloadToFile: filePath => ctx.wa.downloadToFile(messageContext.raw, filePath),
               downloadBytes: () => ctx.wa.downloadBytes(messageContext.raw),
            };

            ctx.events.emit('media', mediaContext);
            if (['image', 'video', 'gif', 'sticker'].includes(mediaContext.type)) {
               ctx.events.emit(mediaContext.type, mediaContext);
            }
         },
      );
   },
};
