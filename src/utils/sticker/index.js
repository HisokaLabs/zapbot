import { buildExif } from '#utils/sticker/exif.js';
import { injectWebPEXIF } from '#utils/sticker/riff.js';
import { toWebP512, videoToWebP } from '#utils/sticker/webp.js';

/**
 * Build a WhatsApp sticker from raw media bytes.
 *
 * @param {Buffer} data Source media bytes.
 * @param {object} [options]
 * @param {string} [options.pack] Sticker pack name (`sticker-pack-name`).
 * @param {string} [options.author] Sticker pack publisher.
 * @param {boolean} [options.isSticker] The input is already a WebP sticker;
 *   try to inject EXIF directly before re-converting.
 * @param {boolean} [options.isVideo] The input is a video/animated GIF.
 * @param {object} [options.imageOptions] Forwarded to {@link #utils/sticker/webp.js.toWebP512}.
 * @returns {Promise<Buffer>} WebP-encoded sticker bytes.
 */
export async function buildSticker(data, options = {}) {
   const { pack, author = '', isSticker = false, isVideo = false, imageOptions } = options;

   if (!data || data.length === 0) throw new Error('Media is empty');

   const exif = buildExif(pack, author);

   if (isSticker) {
      try {
         return await injectWebPEXIF(data, exif);
      } catch (error) {
         let webp;
         try {
            webp = await stickerFallbackToWebP(data, isVideo, imageOptions);
         } catch (convError) {
            throw new Error(
               `sticker is not a valid WebP and failed to convert: ${convError.message} (inject exif: ${error.message})`,
               { cause: convError },
            );
         }
         return await injectWebPEXIF(webp, exif);
      }
   }

   const webp = await stickerFallbackToWebP(data, isVideo, imageOptions);
   return injectWebPEXIF(webp, exif);
}

/**
 * @param {Buffer} data
 * @param {boolean} isVideo
 * @param {object | undefined} imageOptions
 * @returns {Promise<Buffer>}
 */
async function stickerFallbackToWebP(data, isVideo, imageOptions) {
   return isVideo ? videoToWebP(data) : toWebP512(data, imageOptions);
}
