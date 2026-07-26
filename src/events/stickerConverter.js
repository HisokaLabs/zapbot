/**
 *
 * @type {import('#types').BotEventModule}
 */
export default {
   name: 'stickerConverter',

   /** @param {import('#types').BotContext} ctx */
   register(ctx) {
      ctx.events.on('image', mediaContext => convert(ctx, mediaContext));
      ctx.events.on('gif', mediaContext => convert(ctx, mediaContext));
      ctx.events.on('video', mediaContext => {
         const limit = ctx.config.get('autoSticker.videoDurationLimit', 10);
         if ((mediaContext.seconds ?? Infinity) > limit) return;
         convert(ctx, mediaContext);
      });
   },
};

/**
 * @param {import('#types').BotContext} ctx
 * @param {import('#types').MediaContext} mediaContext
 */
async function convert(ctx, mediaContext) {
   if (!ctx.config.get('autoSticker.enabled', false)) return;
   if (mediaContext.raw.key.fromMe) return;

   try {
      const bytes = await mediaContext.downloadBytes();
      const stickerBuffer = await ctx.utils.sticker.createSticker(Buffer.from(bytes), {
         pack: ctx.config.get('autoSticker.packname', 'Bot Sticker'),
         author: ctx.config.get('autoSticker.author', 'Developer'),
      });

      await ctx.wa.reply(mediaContext.raw, {
         type: 'sticker',
         media: stickerBuffer,
         mimetype: 'image/webp',
      });
   } catch (error) {
      ctx.logger.error('Automatic sticker conversion failed', {
         error: error instanceof Error ? error.message : String(error),
      });
   }
}
