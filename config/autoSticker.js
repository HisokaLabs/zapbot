import 'dotenv/config';

import { bool, cleanEnv, num, str } from 'envalid';

const env = cleanEnv(process.env, {
   AUTO_STICKER_ENABLED: bool({ default: false }),
   AUTO_STICKER_VIDEO_DURATION_LIMIT: num({ default: 10 }),
   AUTO_STICKER_PACKNAME: str({ default: 'Bot Sticker' }),
   AUTO_STICKER_AUTHOR: str({ default: 'Developer' }),
});

/** @type {import('#types').AutoStickerConfig} */
export default {
   /** Master switch. When false, incoming media is never auto-converted. */
   enabled: env.AUTO_STICKER_ENABLED,

   /** Videos longer than this (in seconds) are ignored, not converted. */
   videoDurationLimit: env.AUTO_STICKER_VIDEO_DURATION_LIMIT,

   /** Sticker pack name embedded in the WebP EXIF metadata. */
   packname: env.AUTO_STICKER_PACKNAME,

   /** Sticker author embedded in the WebP EXIF metadata. */
   author: env.AUTO_STICKER_AUTHOR,
};
