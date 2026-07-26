import moment from 'moment-timezone';

/** @typedef {import('#types').LogLevel} LogLevel */

const LEVEL_RANK = { trace: 10, debug: 20, info: 30, warn: 40, error: 50 };

const COLORS = {
   trace: '\x1b[90m',
   debug: '\x1b[36m',
   info: '\x1b[32m',
   warn: '\x1b[33m',
   error: '\x1b[31m',
   success: '\x1b[32m',
   reset: '\x1b[0m',
   dim: '\x1b[2m',
};

export class Logger {
   /**
    * @param {LogLevel} [level]
    * @param {Record<string, unknown>} [bindings]
    */
   constructor(level = 'info', bindings = {}) {
      /** @type {LogLevel} */
      this.level = level;
      this.bindings = bindings;
   }

   /**
    * @param {LogLevel | 'success'} at Display label/color key.
    * @param {LogLevel} level Level used for the rank filter against `this.level`.
    * @param {string} message
    * @param {Record<string, unknown>} [context]
    */
   write(at, level, message, context) {
      if (LEVEL_RANK[level] < LEVEL_RANK[this.level]) return;
      const color = COLORS[at] ?? '';
      const time = moment().format('YYYY-MM-DD HH:mm:ss.SSS Z');
      const merged = { ...this.bindings, ...context };
      const scope = merged.scope ? ` ${COLORS.dim}(${merged.scope})${COLORS.reset} ` : '';
      const extra = Object.keys(merged).filter(k => k !== 'scope').length
         ? ` ${COLORS.dim}${JSON.stringify(
              Object.fromEntries(Object.entries(merged).filter(([k]) => k !== 'scope')),
           )}${COLORS.reset}`
         : '';

      console.log(
         `${COLORS.dim}[${time}]${COLORS.reset} ${color}${at.toUpperCase()}${COLORS.reset}${scope} ${message}${extra}`,
      );
   }

   /** @param {string} message @param {Record<string, unknown>} [context] */
   trace(message, context) {
      this.write('trace', 'trace', message, context);
   }

   /** @param {string} message @param {Record<string, unknown>} [context] */
   debug(message, context) {
      this.write('debug', 'debug', message, context);
   }

   /** @param {string} message @param {Record<string, unknown>} [context] */
   info(message, context) {
      this.write('info', 'info', message, context);
   }

   /** @param {string} message @param {Record<string, unknown>} [context] */
   warn(message, context) {
      this.write('warn', 'warn', message, context);
   }

   /** @param {string} message @param {Record<string, unknown>} [context] */
   error(message, context) {
      this.write('error', 'error', message, context);
   }

   /** @param {string} message @param {Record<string, unknown>} [context] */
   success(message, context) {
      this.write('success', 'info', message, context);
   }

   /**
    * Returns a derived logger that pre-binds `bindings` into every log call.
    * @param {Record<string, unknown>} bindings
    * @returns {Logger}
    */
   child(bindings) {
      return new Logger(this.level, { ...this.bindings, ...bindings });
   }
}

export default Logger;
