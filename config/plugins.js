import 'dotenv/config';

import { cleanEnv, str } from 'envalid';

const env = cleanEnv(process.env, {
   PLUGINS_DIRECTORY: str({ default: './src/plugins' }),
});

/** Plugin loader settings. */
export default {
   /** Directory recursively scanned for `<category>/<name>.js` plugin files. */
   directory: env.PLUGINS_DIRECTORY,
};
