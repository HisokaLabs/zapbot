import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { splitJid } from 'zapo-js';

import { isDeveloper } from '#utils/developer.js';

const execFileAsync = promisify(execFile);

const DEFAULTS = {
   mode: 'auto',
   image: 'debian:bookworm-slim',
   timeoutMs: 15_000,
   maxOutput: 4000,
   memory: '256m',
   cpus: '0.5',
   pidsLimit: 64,
   network: false,
   readOnly: true,
   user: '65534:65534',
};

/** Extra time given to the container CLI so it can tear the container down. */
const TEARDOWN_GRACE_MS = 5000;
/** Cap on captured stdout+stderr before the child process is aborted. */
const MAX_BUFFER = 1024 * 1024;

/**
 * A resolved container runtime.
 *
 * @typedef {object} ContainerRuntime
 * @property {'docker' | 'podman'} kind
 * @property {string} binary
 */

/**
 * Host (unsandboxed) execution.
 *
 * @typedef {object} HostRuntime
 * @property {'host'} kind
 * @property {string} binary
 * @property {boolean} fallback true when auto-detection found no container runtime
 */

/**
 * An explicitly requested runtime that is not installed.
 *
 * @typedef {object} MissingRuntime
 * @property {'missing'} kind
 * @property {string} wanted
 */

/** @typedef {ContainerRuntime | HostRuntime | MissingRuntime} Runtime */

/**
 * @typedef {object} ExecSettings
 * @property {string} image
 * @property {number} timeoutMs
 * @property {number} maxOutput
 * @property {string} memory
 * @property {string} cpus
 * @property {number} pidsLimit
 * @property {boolean} network
 * @property {boolean} readOnly
 * @property {string} user
 */

/**
 * @type {Runtime | undefined}
 */
let runtimeCache;

/**
 * @type {import('#types').BotPlugin}
 */
export default {
   name: 'exec',
   type: 'command',
   commands: ['exec', 'shell'],
   triggers: { $: 'exec' },
   description: 'Run a shell command inside an isolated, disposable sandbox (developer only)',

   /** @param {import('#types').BotContext} ctx */
   init(ctx) {
      ctx.logger.debug('exec plugin initialized (sandboxed)');
   },

   /** @param {import('#types').CommandContext} command */
   async execute(command) {
      const { ctx } = command;

      if (!isDeveloper(ctx, command.senderJid)) {
         await command.reply('This command is restricted to bot developers only.');
         return;
      }

      const input = command.args.join(' ').trim();
      if (!input) {
         await command.reply('Please enter a command to run.\nExample: .exec ls -la  |  $ ls -la');
         return;
      }

      const settings = readSettings(ctx);
      const runtime = await resolveRuntime(ctx);

      if (runtime.kind === 'missing') {
         await command.reply(
            `Sandbox "${runtime.wanted}" is not available.\n` +
               `Install ${runtime.wanted}, or set EXEC_SANDBOX_MODE=host to run without isolation (risky).`,
         );
         return;
      }

      const containerName = 'container-' + splitJid(command.senderJid).user;

      const args =
         runtime.kind === 'host'
            ? hostArgs(runtime, input)
            : containerArgs(runtime, input, containerName, settings);

      try {
         const { stdout, stderr } = await execFileAsync(runtime.binary, args, {
            timeout: settings.timeoutMs + TEARDOWN_GRACE_MS,
            maxBuffer: MAX_BUFFER,
            shell: false,
         });
         const body = [stdout, stderr].filter(Boolean).join('\n').trim();
         const output = truncate(body || '(no output)', settings.maxOutput);
         const note =
            runtime.kind === 'host' && runtime.fallback
               ? '⚠️ No container runtime available — command executed on HOST without isolation.\n'
               : '';
         await command.reply(`${note}\`\`\`sh\n${output}\n\`\`\``);
      } catch (error) {
         const message = truncate(formatExecError(error, settings.timeoutMs), settings.maxOutput);
         await command.reply(`Error: ${message}`);
         ctx.logger.error('exec command failed', { error: message });
      }
   },
};

/**
 * @param {import('#types').BotContext} ctx
 * @returns {ExecSettings}
 */
function readSettings(ctx) {
   return {
      image: String(ctx.config.get('exec.image', DEFAULTS.image) ?? DEFAULTS.image),
      timeoutMs: Number(ctx.config.get('exec.timeoutMs', DEFAULTS.timeoutMs) ?? DEFAULTS.timeoutMs),
      maxOutput: Number(ctx.config.get('exec.maxOutput', DEFAULTS.maxOutput) ?? DEFAULTS.maxOutput),
      memory: String(ctx.config.get('exec.memory', DEFAULTS.memory) ?? DEFAULTS.memory),
      cpus: String(ctx.config.get('exec.cpus', DEFAULTS.cpus) ?? DEFAULTS.cpus),
      pidsLimit: Number(ctx.config.get('exec.pidsLimit', DEFAULTS.pidsLimit) ?? DEFAULTS.pidsLimit),
      network: Boolean(ctx.config.get('exec.network', DEFAULTS.network)),
      readOnly: Boolean(ctx.config.get('exec.readOnly', DEFAULTS.readOnly)),
      user: String(ctx.config.get('exec.user', DEFAULTS.user) ?? DEFAULTS.user),
   };
}

/**
 * @param {import('#types').BotContext} ctx
 * @returns {Promise<Runtime>}
 */
async function resolveRuntime(ctx) {
   if (runtimeCache !== undefined) return runtimeCache;

   const mode = String(ctx.config.get('exec.mode', DEFAULTS.mode) ?? DEFAULTS.mode);

   if (mode === 'docker' || mode === 'podman') {
      runtimeCache = (await binaryExists(mode))
         ? { kind: mode, binary: mode }
         : { kind: 'missing', wanted: mode };
      return runtimeCache;
   }

   if (mode === 'host') {
      runtimeCache = { kind: 'host', binary: hostShell(), fallback: false };
      return runtimeCache;
   }

   if (mode !== 'auto') {
      ctx.logger.warn(`exec: unknown sandbox mode "${mode}", treating as "auto"`);
   }

   if (await binaryExists('docker')) {
      runtimeCache = { kind: 'docker', binary: 'docker' };
   } else if (await binaryExists('podman')) {
      runtimeCache = { kind: 'podman', binary: 'podman' };
   } else {
      ctx.logger.warn(
         'exec: no container runtime found, falling back to UNSANDBOXED host execution',
      );
      runtimeCache = { kind: 'host', binary: hostShell(), fallback: true };
   }
   return runtimeCache;
}

/**
 * @param {string} binary
 * @returns {Promise<boolean>}
 */
async function binaryExists(binary) {
   try {
      await execFileAsync(binary, ['--version'], { timeout: 3000 });
      return true;
   } catch {
      return false;
   }
}

/**
 * @returns {string}
 */
function hostShell() {
   return process.platform === 'win32' ? 'cmd.exe' : 'bash';
}

/**
 * Build the `docker run`/`podman run` argument list for one sandboxed command.
 *
 * @param {ContainerRuntime} runtime
 * @param {string} command
 * @param {string} containerName
 * @param {ExecSettings} settings
 * @returns {string[]}
 */
function containerArgs(runtime, command, containerName, settings) {
   const timeoutSecs = Math.max(1, Math.ceil(settings.timeoutMs / 1000));
   const args = ['run', '--rm', '--name', containerName];

   if (!settings.network) args.push('--network=none');
   if (settings.readOnly) args.push('--read-only');
   args.push(
      '--cap-drop=ALL',
      '--security-opt',
      'no-new-privileges',
      '--memory',
      settings.memory,
      '--cpus',
      settings.cpus,
      '--pids-limit',
      String(settings.pidsLimit),
      '--user',
      settings.user,
      '--workdir',
      '/tmp',
      '--tmpfs',
      '/tmp:rw,exec,size=64m,mode=1777',
      '--hostname',
      'sandbox',
      '-e',
      'HOME=/tmp',
      '-e',
      'LANG=C',
      '-e',
      'LC_ALL=C',
   );

   args.push(settings.image);
   args.push('timeout', '-s', 'KILL', String(timeoutSecs), 'bash', '-c', command);
   return args;
}

/**
 * @param {HostRuntime} runtime
 * @param {string} command
 * @returns {string[]}
 */
function hostArgs(runtime, command) {
   return runtime.binary === 'cmd.exe' ? ['/d', '/s', '/c', command] : ['-c', command];
}

/**
 * @param {unknown} error
 * @param {number} timeoutMs
 * @returns {string}
 */
function formatExecError(error, timeoutMs) {
   if (error && typeof error === 'object') {
      const err = /** @type {NodeJS.ErrnoException & { killed?: boolean; code?: string }} */ (
         error
      );
      if (err.code === 'ENOENT') return `Binary not found: ${err.path ?? '?'}`;
      if (err.killed) return `Command timed out (limit ${timeoutMs}ms).`;
      if (err.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER')
         return 'Output exceeded the buffer limit.';
   }
   return error instanceof Error ? error.message : String(error);
}

/**
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
function truncate(text, max) {
   return text.length > max ? `${text.slice(0, max)}…` : text;
}
