import { Worker } from 'node:worker_threads';

import { isDeveloper } from '#utils/developer.js';

/**
 * @type {import('#types').BotPlugin}
 */
export default {
   name: 'eval',
   type: 'command',
   commands: ['eval'],
   triggers: { '>': 'eval' },
   description: 'Evaluate a JavaScript expression inside an isolated VM sandbox (developer only)',

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

      const code = command.args.join(' ').trim();
      if (!code) {
         await command.reply(
            'Please provide a JavaScript expression to evaluate.\nExample: .eval 1 + 1  |  > 1 + 1',
         );
         return;
      }

      try {
         const { logs, resultText, resultType } = await runInSandbox(code);
         const parts = [];
         if (logs.length) parts.push(logs.join('\n'));
         parts.push(`${resultType} => ${resultText}`);
         await command.reply(`\`\`\`js\n${truncate(parts.join('\n'))}\n\`\`\``);
      } catch (error) {
         const message = error instanceof Error ? error.message : String(error);
         await command.reply(`Error: ${truncate(message)}`);
         ctx.logger.error('eval command failed', { error: message });
      }
   },
};

/** Hard cap on a single evaluation (worker is terminated past this). */
const EVAL_TIMEOUT_MS = 5000;
/** Soft cap on the total returned output length (chat-friendly). */
const MAX_OUTPUT = 4000;

/**
 * The evaluator runs in a worker thread (spawned from this inline script) so a
 * runaway or escaped snippet can be hard-killed via `worker.terminate()`, and
 * so even a successful vm escape calling `process.exit()` only takes down the
 * worker — never the bot's main process. Inside the worker the code runs in a
 * fresh `vm` context with no Node host globals (process, require, fs, fetch,
 * child_process, ...), so it cannot touch the filesystem, spawn processes, or
 * reach the network under normal circumstances.
 */
const WORKER_SOURCE = `
const { parentPort } = require('worker_threads');
const vm = require('node:vm');

function safeStringify(value) {
   if (typeof value === 'string') return value;
   if (typeof value === 'function') return value.toString();
   try {
      return JSON.stringify(value, null, 2) ?? String(value);
   } catch {
      return String(value);
   }
}

parentPort.on('message', ({ code }) => {
   const sandbox = {};
   vm.createContext(sandbox);
   try {
      vm.runInContext(
         'globalThis.__logs = [];' +
         'const __fmt = (x) => typeof x === "string" ? x : (() => { try { return JSON.stringify(x, null, 2); } catch { return String(x); } })();' +
         'globalThis.console = {' +
         '  log: (...a) => globalThis.__logs.push(a.map(__fmt).join(" ")),' +
         '  info: (...a) => globalThis.console.log(...a),' +
         '  warn: (...a) => globalThis.console.log(...a),' +
         '  error: (...a) => globalThis.console.log(...a),' +
         '  debug: (...a) => globalThis.console.log(...a),' +
         '};',
         sandbox,
         { timeout: 1000 },
      );
      let script;
      try {
         script = new vm.Script('(async () => { return (' + code + '); })()', { filename: 'eval' });
      } catch {
         script = new vm.Script('(async () => { ' + code + ' })()', { filename: 'eval' });
      }
      const run = script.runInContext(sandbox, { timeout: 4000 });
      Promise.resolve(run).then(
         (result) => {
            parentPort.postMessage({
               ok: true,
               resultType: typeof result,
               resultText: result === undefined ? 'undefined' : safeStringify(result),
               logs: sandbox.__logs || [],
            });
            process.exit(0);
         },
         (error) => {
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
 * @param {string} code
 * @returns {Promise<{ logs: string[], resultText: string, resultType: string }>}
 */
function runInSandbox(code) {
   return new Promise((resolve, reject) => {
      let settled = false;
      const worker = new Worker(WORKER_SOURCE, { eval: true });

      const timer = setTimeout(() => {
         if (settled) return;
         settled = true;
         worker.terminate();
         reject(new Error(`execution exceeded ${EVAL_TIMEOUT_MS}ms`));
      }, EVAL_TIMEOUT_MS);

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
 * @param {string} text
 * @returns {string}
 */
function truncate(text) {
   return text.length > MAX_OUTPUT ? `${text.slice(0, MAX_OUTPUT)}…` : text;
}
