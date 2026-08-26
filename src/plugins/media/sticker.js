/**
 * @type {import('#types').BotPlugin}
 */
export default {
   name: 'sticker',
   type: 'command',
   commands: ['sticker', 's'],
   description: 'Convert an image, GIF, or short video into a sticker',

   /** @param {import('#types').BotContext} ctx */
   init(ctx) {
      ctx.logger.debug('sticker plugin initialized');
   },

   /** @param {import('#types').CommandContext} command */
   async execute(command) {
      const { ctx } = command;
      // .sticker replying to media converts the quoted message; .sticker sent
      // directly as a caption converts the message itself.
      const target = command.quoted?.message ?? command.raw.message;
      const kind = ctx.utils.media.getMessageKind(target);

      if (!['image', 'video', 'gif'].includes(kind)) {
         ctx.pending.wait(command, ['image', 'gif', 'video']);
         await command.reply('Send or reply to an image, GIF, or video with .sticker');
         return;
      }

      try {
         const bytes = await ctx.client.message.downloadBytes(target);
         const buffer = await ctx.utils.sticker.createSticker(Buffer.from(bytes), {
            pack: ctx.config.get('autoSticker.packname', 'Bot Sticker'),
            author: ctx.config.get('autoSticker.author', 'Developer'),
         });

         await command.reply({ type: 'sticker', media: buffer, mimetype: 'image/webp' });
      } catch (error) {
         ctx.logger.error('sticker command failed', {
            error: error instanceof Error ? error.message : String(error),
         });
         await command.reply('Failed to create sticker from that media.');
      }
   },
};
