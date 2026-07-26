import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadDefaultExports } from '#utils/loader.js';

const eventsDir = path.dirname(fileURLToPath(import.meta.url));
const selfFile = fileURLToPath(import.meta.url);

/**
 *
 * @param {import('#types').BotContext} ctx
 */
export async function loadEvents(ctx) {
   const loaded = await loadDefaultExports(eventsDir, { exclude: [selfFile] });

   for (const { module: eventModule, filePath } of loaded) {
      if (!eventModule || typeof eventModule.register !== 'function') {
         ctx.logger.warn(
            `Skipping ${filePath} — does not default-export a valid BotEventModule (missing register()).`,
         );
         continue;
      }
      eventModule.register(ctx);
      ctx.logger.debug(`Event module registered: ${eventModule.name ?? path.basename(filePath)}`);
   }
}

export default loadEvents;
