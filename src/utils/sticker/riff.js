const WEBP_VP8X_EXIF_FLAG = 0x08;
const MAX_UINT32 = 0xffffffff;

/**
 * Inject the WhatsApp sticker EXIF blob into a RIFF/WebP buffer.
 *
 * @param {Buffer} input WebP bytes.
 * @param {Buffer} exif EXIF bytes from {@link #utils/sticker/exif.js}.
 * @returns {Buffer} WebP bytes with the EXIF chunk attached.
 */
export function webpRIFFInjectEXIF(input, exif) {
   if (exif.length === 0) throw new Error('Exif is empty');
   if (
      input.length < 12 ||
      input.toString('latin1', 0, 4) !== 'RIFF' ||
      input.toString('latin1', 8, 12) !== 'WEBP'
   ) {
      throw new Error('The input is not a valid RIFF WebP file');
   }
   if (exif.length > MAX_UINT32) throw new Error('Exif size too large');

   const riffSize = input.readUInt32LE(4);
   if (riffSize + 8 > input.length) throw new Error('The RIFF file size exceeds the file size');
   const parseEnd = riffSize + 8;
   if (parseEnd < 12) throw new Error('The RIFF size is invalid');

   /** @type {{ start: number, dataStart: number, dataEnd: number, end: number, size: number }[]} */
   const chunks = [];
   let vp8xIndex = -1;
   for (let pos = 12; pos < parseEnd;) {
      if (pos + 8 > parseEnd) throw new Error(`The header chunk is truncated at offset ${pos}`);

      const size = input.readUInt32LE(pos + 4);
      const dataStart = pos + 8;
      const dataEnd = dataStart + size;
      if (dataEnd < dataStart || dataEnd > parseEnd) {
         throw new Error(`chunk ${input.toString('latin1', pos, pos + 4)} exceeds the file size`);
      }

      let end = dataEnd;
      if (size % 2 === 1) end++;
      if (end > parseEnd) {
         throw new Error(
            `padding chunk ${input.toString('latin1', pos, pos + 4)} exceeds the file size`,
         );
      }

      const chunk = { start: pos, dataStart, dataEnd, end, size };
      if (input.toString('latin1', pos, pos + 4) === 'VP8X') vp8xIndex = chunks.length;
      chunks.push(chunk);
      pos = end;
   }

   if (vp8xIndex < 0) throw new Error('VP8X chunk not found');
   if (chunks[vp8xIndex].size < 10) throw new Error('VP8X chunk invalid');

   /** @type {Buffer[]} */
   const output = [];
   output.push(input.subarray(0, 12));
   for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (input.toString('latin1', chunk.start, chunk.start + 4) === 'EXIF') continue;

      if (i !== vp8xIndex) {
         output.push(input.subarray(chunk.start, chunk.end));
         continue;
      }

      output.push(input.subarray(chunk.start, chunk.dataStart));
      const vp8x = Buffer.from(input.subarray(chunk.dataStart, chunk.dataEnd));
      vp8x[0] |= WEBP_VP8X_EXIF_FLAG;
      output.push(vp8x);
      if (chunk.size % 2 === 1) output.push(Buffer.from([0]));
   }

   appendWebPChunk(output, Buffer.from('EXIF', 'latin1'), exif);

   const out = Buffer.concat(output);
   if (out.length - 8 > MAX_UINT32) throw new Error('WebP file is too large');
   out.writeUInt32LE(out.length - 8, 4);
   return out;
}

/**
 * Inject EXIF into a WebP buffer.
 *
 * @param {Buffer} input WebP bytes.
 * @param {Buffer} exif EXIF bytes from {@link #utils/sticker/exif.js}.
 * @returns {Buffer} WebP bytes with the EXIF chunk attached.
 */
export function injectWebPEXIF(input, exif) {
   return webpRIFFInjectEXIF(input, exif);
}

/**
 * @param {Buffer[]} output Accumulated output chunks.
 * @param {Buffer} fourCC Chunk four-character code.
 * @param {Buffer} payload Chunk payload.
 */
function appendWebPChunk(output, fourCC, payload) {
   output.push(fourCC);
   const size = Buffer.alloc(4);
   size.writeUInt32LE(payload.length, 0);
   output.push(size);
   output.push(payload);
   if (payload.length % 2 === 1) output.push(Buffer.from([0]));
}
