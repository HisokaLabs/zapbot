import { Sticker, StickerTypes } from 'wa-sticker-formatter';

/** @typedef {import('#types').StickerOptions} StickerOptions */

const TYPE_MAP = {
   default: StickerTypes.DEFAULT,
   full: StickerTypes.FULL,
   crop: StickerTypes.CROPPED,
};

/**
 *
 * @param {Buffer} buffer Source image or video bytes.
 * @param {StickerOptions} [options]
 * @returns {Promise<Buffer>} WebP-encoded sticker bytes.
 */
export async function createSticker(buffer, options = {}) {
   const sticker = new Sticker(buffer, {
      pack: options.pack ?? 'Bot Sticker',
      author: options.author ?? 'Developer',
      type: TYPE_MAP[options.type ?? 'default'] ?? StickerTypes.DEFAULT,
      categories: options.categories ?? ['🤖'],
      quality: options.quality ?? 70,
   });

   return sticker.toBuffer();
}

export default createSticker;
