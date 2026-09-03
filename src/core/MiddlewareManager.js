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
         throw new TypeError('Middleware must be a function: (ctx, next) => any | Promise<any>');
      }
      this.stack.push(middleware);
   }

   /**
    * @returns {(ctx: MessageContext, next?: (ctx: MessageContext) => any) => Promise<any>}
    */
   compose() {
      const stack = this.stack;

      return async function composed(ctx, next) {
         let index = -1;

         /** @param {number} i */
         const dispatch = async i => {
            if (i <= index) throw new Error('next() called multiple times');
            index = i;

            const middleware = i < stack.length ? stack[i] : next;
            if (!middleware) return;

            return await middleware(ctx, () => dispatch(i + 1));
         };

         return await dispatch(0);
      };
   }

   /**
    * @param {MessageContext} ctx
    * @param {function(MessageContext): any} [final]
    * @returns {Promise<any>}
    */
   async execute(ctx, final) {
      return await this.compose()(ctx, final);
   }
}

export default MiddlewareManager;
