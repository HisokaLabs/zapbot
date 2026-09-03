/**
 * @type {import('#types').Middleware}
 */
export async function blockGuard(message, next) {
   if (message.text && message.text.includes('block')) {
      // set logger level to debug for testing purposes
      message.ctx.logger.debug('[testing] guard halted message', { text: message.text });
      return;
   }

   return await next();
}

/**
 * @type {import('#types').Middleware}
 */
export async function shoutTransform(message, next) {
   if (message.text) {
      message.text = message.text.toUpperCase();

      // set logger level to debug for testing purposes
      message.ctx.logger.debug('[testing] transform modified message', { text: message.text });
   }

   return await next();
}

/**
 * @type {import('#types').Middleware}
 */
export async function timingLifecycle(message, next) {
   const start = Date.now();
   const result = await next();

   // set logger level to debug for testing purposes
   message.ctx.logger.debug('[testing] lifecycle', {
      ms: Date.now() - start,
      result,
   });

   return result;
}
