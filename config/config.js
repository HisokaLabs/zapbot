import 'dotenv/config';

function env(name, fallback) {
   const value = process.env[name];
   return !value ? fallback : value;
}

function envBool(name, fallback) {
   const value = process.env[name];
   if (!value) return fallback;
   return value.toLowerCase() === 'true';
}

function envInt(name, fallback) {
   const value = process.env[name];
   if (!value) return fallback;
   const parsed = Number.parseInt(value, 10);
   return Number.isNaN(parsed) ? fallback : parsed;
}

function envList(name, fallback) {
   const value = process.env[name];
   if (!value) return fallback;
   return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
}

/**
 *
 * @type {import('#types').BotConfig}
 */
export default {
   prefix: envList('PREFIX', ['.', '!', '#']),

   session: {
      /** Logical session identifier, forwarded to zapo's `WaClient`. only allow alphanumeric characters and hyphens */
      id: env('SESSION_ID', 'default'),

      /** Where the SQLite auth/session store is persisted on disk. */
      storePath: env('SESSION_STORE_PATH', './.auth/state.sqlite'),

      /** Device browser name, forwarded to zapo's `WaClient`. */
      deviceBrowser: env('SESSION_DEVICE_BROWSER', 'edge'),

      /** Operating system display name, forwarded to zapo's `WaClient`. */
      deviceOsDisplayName: env('SESSION_OS_DISPLAY_NAME', 'Windows'),

      /**
       * Pairing method: 'qr' renders a QR code in the terminal, 'code'
       * requests an 8-character pairing code for `phoneNumber` instead.
       */
      pairing: env('SESSION_PAIRING', 'qr'),

      /** Required when `pairing` is 'code'. Digits only, with country code. */
      phoneNumber: env('SESSION_PHONE_NUMBER', ''),

      /** Reconnect automatically after a non-logout disconnect. */
      autoReconnect: envBool('SESSION_AUTO_RECONNECT', true),

      /** Maximum reconnect attempts before giving up (exponential backoff). */
      maxReconnectAttempts: envInt('SESSION_MAX_RECONNECT_ATTEMPTS', 10),

      /** Whether to mark the account as online when connecting. */
      markOnlineOnConnect: envBool('SESSION_MARK_ONLINE_ON_CONNECT', false),
   },

   /** Automatic sticker conversion (see events/stickerConverter.js). */
   autoSticker: {
      /** Master switch. When false, incoming media is never auto-converted. */
      enabled: envBool('AUTO_STICKER_ENABLED', false),

      /** Videos longer than this (in seconds) are ignored, not converted. */
      videoDurationLimit: envInt('AUTO_STICKER_VIDEO_DURATION_LIMIT', 10),

      /** Sticker pack name embedded in the WebP EXIF metadata. */
      packname: env('AUTO_STICKER_PACKNAME', 'Bot Sticker'),

      /** Sticker author embedded in the WebP EXIF metadata. */
      author: env('AUTO_STICKER_AUTHOR', 'Developer'),
   },

   /**
    * Transient pending-command memory (see core/PendingCommandManager.js).
    * Holds commands waiting for a user's next message, in memory only.
    */
   pendingCommand: {
      /** How long (ms) a pending command waits for the user's next message. */
      timeout: envInt('PENDING_COMMAND_TIMEOUT', 60_000),
   },

   /** Developer-only gate: commands in the `developer` category (eval, exec, ...) are restricted to these numbers. */
   developer: {
      /** Comma-separated list of developer phone numbers (digits only, with country code). */
      numbers: envList('BOT_DEVELOPER_NUMBER', []),
   },

   /** Plugin loader settings. */
   plugins: {
      /** Directory recursively scanned for `<category>/<name>.js` plugin files. */
      directory: env('PLUGINS_DIRECTORY', './src/plugins'),
   },

   /** logger settings (see core/Logger.js). */
   logger: {
      /** 'trace' | 'debug' | 'info' | 'warn' | 'error' */
      level: env('LOG_LEVEL', 'info'),

      /** Whether to pretty-print logs to the console (required pino-pretty). */
      pretty: envBool('LOG_PRETTY', true),

      /** Name of the logger, included in each log line. */
      name: env('LOG_NAME', 'ZapBot'),
   },
};
