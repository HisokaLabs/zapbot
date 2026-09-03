import 'dotenv/config';

import { cleanEnv, str } from 'envalid';

const env = cleanEnv(process.env, {
   BOT_DEVELOPER_NUMBER: str({ default: '' }),
});

/** @type {import('#types').DeveloperConfig} */
export default {
   /** Comma-separated list of developer phone numbers (digits only, with country code). */
   numbers: env.BOT_DEVELOPER_NUMBER.split(',')
      .map(item => item.trim())
      .filter(Boolean),
};
