/** @typedef {import('#types').Middleware} Middleware */
/** @typedef {import('#types').MessageContext} MessageContext */

export class MiddlewareManager {
   constructor() {
      /** @type {Middleware[]} */
      this.stack = [];
   }

   /** @param {Middleware} middleware */
   use(middleware) {
      if (typeof middleware !== 'function') {
         throw new TypeError('Middleware must be a function: (ctx, next) => Promise<void> | void');
      }
      this.stack.push(middleware);
   }

   /**
    * Runs the full stack against `ctx`, in registration order.
    * @param {MessageContext} ctx
    * @returns {Promise<void>}
    */
   async execute(ctx) {
      let index = -1;

      /** @param {number} i */
      const dispatch = async i => {
         if (i <= index) throw new Error('next() called multiple times');
         index = i;
         const middleware = this.stack[i];
         if (!middleware) return;
         await middleware(ctx, () => dispatch(i + 1));
      };

      await dispatch(0);
   }
}

export default MiddlewareManager;
