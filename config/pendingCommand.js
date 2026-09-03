import 'dotenv/config';

import { cleanEnv, num } from 'envalid';

const env = cleanEnv(process.env, {
   PENDING_COMMAND_TIMEOUT: num({ default: 60_000 }),
});

/**
 * Transient pending-command memory (see core/PendingCommandManager.js). Holds
 * commands waiting for a user's next message, in memory only.
 */
export default {
   /** How long (ms) a pending command waits for the user's next message. */
   timeout: env.PENDING_COMMAND_TIMEOUT,
};
