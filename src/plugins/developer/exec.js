/**
 * @type {import('#types').BotPlugin}
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { isDeveloper } from '#utils/developer.js';

const execFileAsync = promisify(execFile);

/** Max combined stdout+stderr bytes before the call is aborted. */
const MAX_BUFFER = 1024 * 1024;
/** Hard timeout for a single command. */
const TIMEOUT_MS = 15_000;
/** Cap on returned output length (chat-friendly). */
const MAX_OUTPUT = 4000;

/**
 * Binaries the developer is allowed to invoke. `execFile` runs *without a
 * shell*, so shell metacharacters (`;`, `|`, `>`, `$(...)`, backticks) are
 * never interpreted — they become literal arguments to the binary. Anything
 * not listed here is rejected, which keeps destructive/abusable commands off
 * the server. Edit this set to widen or narrow what the bot may run.
 */
const ALLOWED_BINARIES = new Set([
   'ls',
   'cat',
   'echo',
   'pwd',
   'date',
   'whoami',
   'uname',
   'uptime',
   'df',
   'free',
   'ps',
   'head',
   'tail',
   'wc',
   'grep',
   'find',
   'sort',
   'uniq',
   'node',
   'npm',
   'npx',
   'git',
   'ping',
   'curl',
   'wget',
   'python',
   'python3',
]);

export default {
   name: 'exec',
   type: 'command',
   commands: ['exec', 'shell'],
   triggers: { $: 'exec' },
   description: 'Run an allowlisted, shell-free command on the host (developer only)',

   /** @param {import('#types').BotContext} ctx */
   init(ctx) {
      ctx.logger.debug('exec plugin initialized');
   },

   /** @param {import('#types').CommandContext} command */
   async execute(command) {
      const { ctx } = command;

      if (!isDeveloper(ctx, command.senderJid)) {
         await command.reply('Perintah ini hanya dapat digunakan oleh developer bot.');
         return;
      }

      const input = command.args.join(' ').trim();
      if (!input) {
         await command.reply(
            'Masukkan perintah yang ingin dijalankan.\nContoh: .exec ls -la  |  $ ls -la',
         );
         return;
      }

      // Split into binary + args, then reject any path so only PATH-resolved,
      // allowlisted binaries can run (no `/evil/ls`).
      const tokens = input.split(/\s+/);
      const binary = tokens[0];
      const args = tokens.slice(1);

      if (binary.includes('/') || binary.includes('\\')) {
         await command.reply(
            'Jalur absolut/relatif tidak diperbolehkan. Gunakan nama binary saja.',
         );
         return;
      }
      if (!ALLOWED_BINARIES.has(binary)) {
         await command.reply(
            `Binary "${binary}" not on allowlist.\nAllowed: ${[...ALLOWED_BINARIES]
               .sort()
               .join(', ')}`,
         );
         return;
      }

      try {
         const { stdout, stderr } = await execFileAsync(binary, args, {
            timeout: TIMEOUT_MS,
            maxBuffer: MAX_BUFFER,
            shell: false,
         });
         const output = [stdout, stderr].filter(Boolean).join('\n').trim();
         await command.reply(`\`\`\`sh\n${truncate(output || '(no output)')}\n\`\`\``);
      } catch (error) {
         await command.reply(`Error: ${truncate(formatExecError(error))}`);
         ctx.logger.error('exec command failed', { error: formatExecError(error) });
      }
   },
};

/**
 * @param {unknown} error
 * @returns {string}
 */
function formatExecError(error) {
   if (error && typeof error === 'object') {
      const err = /** @type {NodeJS.ErrnoException & { killed?: boolean }} */ (error);
      if (err.code === 'ENOENT') return `Binary not found: ${err.path}`;
      if (err.killed) return `Command timed out (timeout ${TIMEOUT_MS}ms).`;
   }
   return error instanceof Error ? error.message : String(error);
}

/**
 * @param {string} text
 * @returns {string}
 */
function truncate(text) {
   return text.length > MAX_OUTPUT ? `${text.slice(0, MAX_OUTPUT)}…` : text;
}
