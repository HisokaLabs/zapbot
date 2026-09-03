import 'dotenv/config';

import { bool, cleanEnv, num, str } from 'envalid';

const env = cleanEnv(process.env, {
   SESSION_ID: str({ default: 'default' }),
   SESSION_STORE_PATH: str({ default: './.auth/state.sqlite' }),
   SESSION_DEVICE_BROWSER: str({ default: 'edge' }),
   SESSION_OS_DISPLAY_NAME: str({ default: 'Windows' }),
   SESSION_PAIRING: str({ default: 'qr', choices: ['qr', 'code'] }),
   SESSION_PHONE_NUMBER: str({ default: '' }),
   SESSION_AUTO_RECONNECT: bool({ default: true }),
   SESSION_MAX_RECONNECT_ATTEMPTS: num({ default: 10 }),
   SESSION_MARK_ONLINE_ON_CONNECT: bool({ default: false }),
});

/** @type {import('#types').BotSessionConfig} */
export default {
   /** Logical session identifier, forwarded to zapo's `WaClient`. Only alphanumeric characters and hyphens. */
   id: env.SESSION_ID,

   /** Where the SQLite auth/session store is persisted on disk. */
   storePath: env.SESSION_STORE_PATH,

   /** Device browser name, forwarded to zapo's `WaClient`. */
   deviceBrowser: env.SESSION_DEVICE_BROWSER,

   /** Operating system display name, forwarded to zapo's `WaClient`. */
   deviceOsDisplayName: env.SESSION_OS_DISPLAY_NAME,

   /** Pairing method: 'qr' renders a QR code, 'code' requests an 8-character pairing code. */
   pairing: env.SESSION_PAIRING,

   /** Required when `pairing` is 'code'. Digits only, with country code. */
   phoneNumber: env.SESSION_PHONE_NUMBER,

   /** Reconnect automatically after a non-logout disconnect. */
   autoReconnect: env.SESSION_AUTO_RECONNECT,

   /** Maximum reconnect attempts before giving up (exponential backoff). */
   maxReconnectAttempts: env.SESSION_MAX_RECONNECT_ATTEMPTS,

   /** Whether to mark the account as online when connecting. */
   markOnlineOnConnect: env.SESSION_MARK_ONLINE_ON_CONNECT,
};
