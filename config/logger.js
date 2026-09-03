import 'dotenv/config';

import { bool, cleanEnv, str } from 'envalid';

const env = cleanEnv(process.env, {
   LOG_LEVEL: str({ default: 'info', choices: ['trace', 'debug', 'info', 'warn', 'error'] }),
   LOG_PRETTY: bool({ default: true }),
   LOG_NAME: str({ default: 'ZapBot' }),
});

/** Logger settings (see core/Logger.js). */
export default {
   /** 'trace' | 'debug' | 'info' | 'warn' | 'error' */
   level: env.LOG_LEVEL,

   /** Whether to pretty-print logs to the console (requires pino-pretty). */
   pretty: env.LOG_PRETTY,

   /** Name of the logger, included in each log line. */
   name: env.LOG_NAME,
};
