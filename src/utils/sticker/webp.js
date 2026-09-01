import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import sharp from 'sharp';

const SIZE = 512;
const IMAGE_QUALITY = 80;

/**
 * Convert an image buffer into a 512x512 WebP, scaling to fit and
 *
 * @param {Buffer} data Source image bytes.
 * @param {object} [options]
 * @param {number} [options.quality] WebP quality 0-100 (default 80).
 * @param {'contain' | 'cover'} [options.fit] `contain` pads with transparency, `cover` crops to fill (default `contain`).
 * @returns {Promise<Buffer>} WebP-encoded bytes.
 */
export async function toWebP512(data, options = {}) {
   const quality = options.quality ?? IMAGE_QUALITY;
   const fit = options.fit ?? 'contain';

   return sharp(data)
      .resize(SIZE, SIZE, {
         fit,
         background: { r: 0, g: 0, b: 0, alpha: 0 },
         kernel: 'cubic',
      })
      .webp({ quality, lossless: false })
      .toBuffer();
}

/**
 * Convert a video (or animated GIF) buffer into an animated WebP sticker via ffmpeg.
 *
 * @param {Buffer} data Source video/GIF bytes.
 * @returns {Promise<Buffer>} Animated WebP bytes.
 */
export async function videoToWebP(data) {
   const dir = await mkdtemp(path.join(tmpdir(), 'vidtowebp-'));
   try {
      const inFile = path.join(dir, 'input');
      const outFile = path.join(dir, 'output.webp');
      await writeFile(inFile, data);

      await runFfmpeg([
         '-hide_banner',
         '-loglevel',
         'error',
         '-y',
         '-hwaccel',
         'auto',
         '-t',
         '10',
         '-i',
         inFile,
         '-an',
         '-sn',
         '-dn',
         '-vcodec',
         'libwebp',
         '-pix_fmt',
         'yuva420p',
         '-vf',
         'fps=15,scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0,setsar=1',
         '-lossless',
         '0',
         '-q:v',
         '45',
         '-compression_level',
         '4',
         '-loop',
         '0',
         '-preset',
         'default',
         '-vsync',
         '0',
         outFile,
      ]);

      return readFile(outFile);
   } finally {
      await rm(dir, { recursive: true, force: true });
   }
}

/**
 * Run ffmpeg, translating its errors into human-readable messages.
 * With maxBuffer set to 16MB, this should be enough for ffmpeg to output any error messages.
 *
 * @param {string[]} args
 * @returns {Promise<void>}
 */
function runFfmpeg(args) {
   return new Promise((resolve, reject) => {
      execFile('ffmpeg', args, { maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
         if (!error) {
            resolve();
            return;
         }

         if (error.code === 'ENOENT') {
            reject(new Error('ffmpeg is not installed or not in PATH'));
            return;
         }

         const message = (stderr || stdout || '').trim();
         if (message.includes('no decoder found') || message.includes('Decoder')) {
            reject(
               new Error(
                  `The video codec is not supported by FFmpeg (install the full version of FFmpeg): ${message}`,
               ),
            );
            return;
         }

         reject(new Error(message || error.message));
      });
   });
}
