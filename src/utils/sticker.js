/** @typedef {import('#types').StickerOptions} StickerOptions */

import { buildSticker } from '#utils/sticker/index.js';

/**
 * Create a WebP sticker from an image, GIF, or video buffer.
 *
 * @param {Buffer} buffer Source image or video bytes.
 * @param {StickerOptions} [options]
 * @returns {Promise<Buffer>} WebP-encoded sticker bytes.
 */
export async function createSticker(buffer, options = {}) {
   const type = options.type ?? 'default';
   const isVideo = options.isVideo ?? isVideoLike(buffer);
   const isSticker = options.isSticker ?? isStickerLike(buffer);

   return buildSticker(buffer, {
      pack: options.pack ?? 'Bot Sticker',
      author: options.author ?? 'Developer',
      isVideo,
      isSticker,
      imageOptions: {
         quality: options.quality ?? 80,
         fit: type === 'crop' ? 'cover' : 'contain',
      },
   });
}

export default createSticker;

/**
 * Sniff common video/GIF container magic bytes to route the buffer through
 * the ffmpeg path instead of the static image path.
 *
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function isVideoLike(buffer) {
   if (buffer.length < 8) return false;
   if (buffer.toString('latin1', 0, 3) === 'GIF') return true; // GIF87a / GIF89a
   if (buffer.toString('latin1', 0, 4) === '\x1a\x45\xdf\xa3') return true; // WebM/MKV (EBML)
   if (buffer.toString('latin1', 4, 8) === 'ftyp') return true; // MP4/MOV/M4V/3GP
   return false;
}

/**
 * Sniff common WebP container magic bytes to route the buffer through
 * the static image path instead of the ffmpeg path.
 *
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function isStickerLike(buffer) {
   if (buffer.length < 12) return false;
   if (buffer.toString('latin1', 0, 4) !== 'RIFF') return false;
   if (buffer.toString('latin1', 8, 12) !== 'WEBP') return false;
   return true;
}
