import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspect } from 'node:util';
import { Worker } from 'node:worker_threads';

import { isDeveloper } from '#utils/developer.js';

/* eslint-disable no-unused-vars */
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/* eslint-enable no-unused-vars */

/**
 * @type {import('#types').BotPlugin}
 */
export default {
   name: 'eval',
   type: 'command',
   commands: ['eval'],
   triggers: { '>': 'eval' },
   description:
      'Evaluate JavaScript code (developer only). Modes: safe (isolated vm) | full (native eval, full process access)',

   /** @param {import('#types').BotContext} ctx */
   init(ctx) {
      ctx.logger.debug('eval plugin initialized');
   },

   /** @param {import('#types').CommandContext} command */
   async execute(command) {
      const { ctx } = command;

      if (!isDeveloper(ctx, command.senderJid)) {
         await command.reply('This command is restricted to bot developers only.');
         return;
      }

      const input = extractCode(command);
      const { mode: flagMode, code } = parseInvocation(input);

      if (!code) {
         await command.reply(
            'Please provide JavaScript code to evaluate.\n' +
               'Example: .eval 1 + 1  |  > 1 + 1\n' +
               'Modes: .eval --safe <code> (default)  |  .eval --full <code> (full access)',
         );
         return;
      }

      const settings = readSettings(ctx);
      const mode = flagMode ?? settings.mode;

      try {
         const { logs, resultText, resultType } =
            mode === 'full'
               ? await runFull(code, command)
               : await runSafe(code, settings.timeoutMs);
         const parts = [];
         if (logs.length) parts.push(logs.join('\n'));
         parts.push(`${resultType} => ${resultText}`);
         const body = truncate(parts.join('\n'), settings.maxOutput);
         const note =
            mode === 'full'
               ? '⚠️ FULL ACCESS — native eval in the bot process (at your own risk):\n'
               : '';
         await command.reply(`${note}\n\n${body}`);
      } catch (error) {
         const message = error instanceof Error ? error.message : String(error);
         await command.reply(`Error: ${truncate(message, settings.maxOutput)}`);
         ctx.logger.error('eval command failed', { error: message });
      }
   },
};

const SCRIPT_TIMEOUT_MS = config('eval.timeoutMs', 5000);

/**
 * @param {unknown} value
 * @returns {string}
 */
function stringify(value) {
   if (typeof value === 'string') return value;
   if (typeof value === 'function') return value.toString();
   if (typeof value === 'bigint') return `${value}n`;
   if (typeof value === 'symbol') return value.toString();
   if (value === undefined) return 'undefined';
   try {
      const json = inspect(value, false, 2, true);
      return json === undefined ? String(value) : json;
   } catch {
      return String(value);
   }
}

/**
 * @param {string[]} logs
 * @returns {{ log: (...args: unknown[]) => void, info: (...args: unknown[]) => void, warn: (...args: unknown[]) => void, error: (...args: unknown[]) => void, debug: (...args: unknown[]) => void }}
 */
function makeConsole(logs) {
   const fmt = x => (typeof x === 'string' ? x : stringify(x));
   const push = (...args) => logs.push(args.map(fmt).join(' '));
   return { log: push, info: push, warn: push, error: push, debug: push };
}

/**
 * The `safe` evaluator runs in a worker thread (spawned from this inline script)
 * so a runaway or escaped snippet can be hard-killed via `worker.terminate()`,
 * and so even a successful vm escape calling `process.exit()` only takes down
 * the worker — never the bot's main process. Inside the worker the code runs in
 * a fresh `vm` context with no Node host globals (`process`, `require`, `fs`,
 * `fetch`, ...), so it cannot touch the filesystem, spawn processes, or reach
 * the network under normal circumstances.
 *
 * The `full` mode does NOT go through a worker or `vm` at all — see `runFull()`.
 */
const WORKER_SOURCE = `
const { parentPort } = require('worker_threads');
const vm = require('node:vm');

const stringify = ${stringify.toString()};
const makeConsole = ${makeConsole.toString()};

parentPort.on('message', ({ code }) => {
   const logs = [];
   const sandbox = {};
   vm.createContext(sandbox);

   sandbox.console = makeConsole(logs);

   try {
      let script;
      try {
         script = new vm.Script(code, { filename: 'eval' });
      } catch {
         try {
            script = new vm.Script('(async () => { return (' + code + '); })()', { filename: 'eval' });
         } catch {
            script = new vm.Script('(async () => { ' + code + '\\n})()', { filename: 'eval' });
         }
      }
      const run = script.runInContext(sandbox, { timeout: ${SCRIPT_TIMEOUT_MS} });
      Promise.resolve(run).then(
         result => {
            parentPort.postMessage({
               ok: true,
               resultType: typeof result,
               resultText: result === undefined ? 'undefined' : stringify(result),
               logs,
            });
            process.exit(0);
         },
         error => {
            parentPort.postMessage({
               ok: false,
               error: error && error.message ? error.message : String(error),
            });
            process.exit(0);
         },
      );
   } catch (error) {
      parentPort.postMessage({
         ok: false,
         error: error && error.message ? error.message : String(error),
      });
      process.exit(0);
   }
});
`;

/**
 * @param {import('#types').CommandContext} command
 * @returns {string}
 */
function extractCode(command) {
   if (command.rest !== undefined) return command.rest.trim();

   const text = command.text ?? '';
   const prefix = command.prefix ?? '';
   const name = command.command ?? '';

   if (!text) return command.args.join(' ').trim();

   let code = text;
   if (prefix && code.startsWith(prefix)) code = code.slice(prefix.length);
   code = code.trimStart();

   if (name && code.startsWith(name)) {
      const rest = code.slice(name.length);
      if (rest === '' || /^\s/.test(rest)) code = rest.trimStart();
   }

   return code.trim();
}

/**
 * @param {string} code
 * @returns {{ mode: 'safe' | 'full' | null, code: string }}
 */
function parseInvocation(code) {
   const match = /^(--safe|--full)\b\s*/.exec(code);
   if (!match) return { mode: null, code };
   const mode = /** @type {'safe' | 'full'} */ (match[1] === '--full' ? 'full' : 'safe');
   return { mode, code: code.slice(match[0].length).trim() };
}

/**
 * @param {import('#types').BotContext} ctx
 * @returns {{ mode: 'safe' | 'full', timeoutMs: number, maxOutput: number }}
 */
function readSettings(ctx) {
   const mode = String(ctx.config.get('eval.mode', 'safe'));
   return {
      mode: mode === 'full' ? 'full' : 'safe',
      timeoutMs: Number(ctx.config.get('eval.timeoutMs')),
      maxOutput: Number(ctx.config.get('eval.maxOutput')),
   };
}

/**
 * @param {string} code
 * @param {number} timeoutMs
 * @returns {Promise<{ logs: string[], resultText: string, resultType: string }>}
 */
function runSafe(code, timeoutMs) {
   return new Promise((resolve, reject) => {
      let settled = false;
      const worker = new Worker(WORKER_SOURCE, { eval: true });

      const timer = setTimeout(() => {
         if (settled) return;
         settled = true;
         worker.terminate();
         reject(new Error(`execution exceeded ${timeoutMs}ms`));
      }, timeoutMs);

      worker.on('message', msg => {
         if (settled) return;
         settled = true;
         clearTimeout(timer);
         worker.terminate();
         if (msg.ok) {
            resolve({ logs: msg.logs, resultText: msg.resultText, resultType: msg.resultType });
         } else reject(new Error(msg.error));
      });

      worker.on('error', err => {
         if (settled) return;
         settled = true;
         clearTimeout(timer);
         reject(err);
      });

      worker.on('exit', code => {
         if (settled) return;
         settled = true;
         clearTimeout(timer);
         reject(new Error(`worker exited unexpectedly (code ${code})`));
      });

      worker.postMessage({ code });
   });
}

/**
 * @param {import('#types').BotContext} _bot
 * @param {string} code
 * @returns {Promise<{ logs: string[], resultText: string, resultType: string }>}
 */
async function runFull(code, _bot) {
   const logs = [];
   const previousConsole = globalThis.console;
   globalThis.console = makeConsole(logs);

   try {
      let result = eval(code);
      if (result && typeof result.then === 'function') result = await result;

      return {
         logs,
         resultType: typeof result,
         resultText: result === undefined ? 'undefined' : stringify(result),
      };
   } finally {
      globalThis.console = previousConsole;
   }
}

/**
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
function truncate(text, max) {
   return text.length > max ? `${text.slice(0, max)}…` : text;
}
