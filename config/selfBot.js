import 'dotenv/config';

import { bool, cleanEnv } from 'envalid';

const env = cleanEnv(process.env, {
   SELF_BOT_ENABLED: bool({ default: false }),
});

/** @type {import('#types').SelfBotConfig} */
export default {
   /** Master switch. When false, everyone can use the bot (default behaviour). */
   enabled: env.SELF_BOT_ENABLED,
};
