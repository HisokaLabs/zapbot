import 'dotenv/config';

import { cleanEnv, str } from 'envalid';

const env = cleanEnv(process.env, {
   PREFIX: str({ default: '.,!,#' }),
});

/**
 * Command prefixes.
 *
 * @type {string[]}
 */
export default env.PREFIX.split(',')
   .map(item => item.trim())
   .filter(Boolean);
