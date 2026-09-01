const PACK_ID =
   'com.snowcorp.stickerly.android.stickercontentprovider b5e7275f-f1de-4137-961f-57becfad34f2';
const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.facebook.katana';
const APPLE_STORE = 'https://apps.apple.com/us/app/facebook/id284882215';

const DEFAULT_PACK = process.env.AUTO_STICKER_PACKNAME || 'Sticker Maker';

/**
 * Build the sticker pack EXIF blob.
 *
 * @param {string} [pack] Sticker pack name (`sticker-pack-name`).
 * @param {string} [author] Sticker pack publisher (`sticker-pack-publisher`).
 * @returns {Buffer} EXIF bytes to embed into the WebP.
 */
export function buildExif(pack = DEFAULT_PACK, author = '') {
   const json = Buffer.from(
      JSON.stringify({
         'sticker-pack-id': PACK_ID,
         'sticker-pack-name': pack,
         'sticker-pack-publisher': author,
         'android-app-store-link': PLAY_STORE,
         'ios-app-store-link': APPLE_STORE,
      }),
      'utf-8',
   );

   const length = json.length;
   const head = Buffer.from([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00,
   ]);

   const lengthByte = length > 256 ? length - 256 : length;
   const code = Buffer.from(
      length > 256
         ? [0x01, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]
         : [0x00, 0x00, 0x16, 0x00, 0x00, 0x00],
   );

   return Buffer.concat([head, Buffer.from([lengthByte]), code, json]);
}

export { APPLE_STORE, DEFAULT_PACK, PACK_ID, PLAY_STORE };
