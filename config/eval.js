import 'dotenv/config';

import { cleanEnv, num, str } from 'envalid';

const env = cleanEnv(process.env, {
   EVAL_MODE: str({ default: 'safe', choices: ['safe', 'full'] }),
   EVAL_TIMEOUT: num({ default: 5000 }),
   EVAL_MAX_OUTPUT: num({ default: 4000 }),
});

/** @type {import('#types').EvalConfig} */
export default {
   /** 'safe' (isolated vm) | 'full' (native eval, full process access) */
   mode: env.EVAL_MODE,

   /** Hard limit (ms) for a single evaluation. */
   timeoutMs: env.EVAL_TIMEOUT,

   /** Cap on returned output length (chat-friendly). */
   maxOutput: env.EVAL_MAX_OUTPUT,
};
