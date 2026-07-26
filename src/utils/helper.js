/**
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
   return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 *
 * @param {number} bytes
 * @param {number} [decimals]
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 2) {
   if (!bytes) return '0 B';
   const units = ['B', 'KB', 'MB', 'GB', 'TB'];
   const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
   const value = bytes / 1024 ** exponent;
   return `${value.toFixed(exponent === 0 ? 0 : decimals)} ${units[exponent]}`;
}

/**
 *
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
   if (ms < 1000) return `${ms}ms`;
   const totalSeconds = Math.floor(ms / 1000);
   const minutes = Math.floor(totalSeconds / 60);
   const seconds = totalSeconds % 60;
   return minutes > 0 ? `${minutes}m ${String(seconds).padStart(2, '0')}s` : `${seconds}s`;
}

/**
 *
 * @param {string} text
 * @param {string} prefix
 * @returns {{ command: string, args: string[] }}
 */
export function parseCommand(text, prefix) {
   const withoutPrefix = text.slice(prefix.length).trim();
   const [command = '', ...args] = withoutPrefix.split(/\s+/);
   return { command: command.toLowerCase(), args };
}

/**
 *
 * @param {string} text
 * @param {string[]} prefixes
 * @returns {string | undefined}
 */
export function matchPrefix(text, prefixes) {
   return prefixes.find(prefix => text.startsWith(prefix));
}

/**
 *
 * @param {string} input
 * @param {unknown} [fallback]
 * @returns {unknown}
 */
export function safeJsonParse(input, fallback = null) {
   try {
      return JSON.parse(input);
   } catch {
      return fallback;
   }
}

/**
 *
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(text, maxLength) {
   return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
