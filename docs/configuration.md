# Configuration 🔧

Configuration is Laravel-style: instead of one big `config.js`, every section lives in its own file under [`config/`](../config/), each default-exporting a plain object. [`config/index.js`](../config/index.js) autoloads them all (any `config/*.js` except itself), merges them into a single object keyed by filename, and exposes a `config(key, fallback)` helper globally. That merged object is what `src/index.js` imports and hands to `core/ConfigManager.js`, which every plugin/event/middleware reads through `ctx.config`.

```
config/
├── index.js         # loader + config() helper (the only "meta" file)
├── prefix.js        # command prefixes
├── session.js       # zapo WaClient session/identity
├── autoSticker.js   # auto sticker converter
├── selfBot.js       # owner-only gate
├── developer.js     # developer phone numbers
├── pendingCommand.js# pending-command timeout
├── eval.js          # developer eval sandbox
├── exec.js          # developer exec sandbox
├── plugins.js       # plugin loader directory
└── logger.js        # logger level/format/name
```

## Reading config

Three equivalent ways to read a value, all dot-path based:

```js
// 1. global helper — available in any module, no import needed
config('session.pairing', 'qr');

// 2. from a plugin/event/middleware, via the shared context
const pairing = ctx.config.get('session.pairing', 'qr');

// 3. raw merged object (rarely needed)
import configData from '#config/index.js'; // { prefix: [...], session: {...}, ... }
```

`config(key, fallback)` and `ctx.config.get(key, fallback)` both walk dot-separated segments and return `fallback` when the path is missing. `ctx.config` is a `ConfigManager` (`core/ConfigManager.js`) wrapping the same merged object; it also offers `set(path, value)` (emits a `change` event), `getAll()`, and `getPrefixes()` (see [Prefix configuration](#prefix-configuration)).

## Adding a new config file

Drop a new `config/<name>.js` that default-exports an object. It is picked up automatically on the next boot — no registration list, no edit to `index.js`. The filename (minus `.js`) becomes its top-level key: `config/session.js` → `config('session.id')`.

```js
// config/myFeature.js
import 'dotenv/config';
import { bool, cleanEnv } from 'envalid';

const env = cleanEnv(process.env, {
   MY_FEATURE_ENABLED: bool({ default: false }),
});

export default {
   enabled: env.MY_FEATURE_ENABLED,
};
```

## Environment variables (`.env`)

Each config file calls `import 'dotenv/config'` and parses its variables with [`envalid`](https://www.npmjs.com/package/envalid), so every field can be overridden by an environment variable without editing the file — and invalid values (e.g. a non-boolean for a `bool` var, or a value outside an allowed `choices` list) **fail fast at boot** instead of silently misbehaving. Copy [`.env.example`](../.env.example) to `.env` (already git-ignored) and fill in what you need; anything left unset falls back to the default shown below.

| `.env` variable                     | Config path                      | Default                | Notes                                                |
| ----------------------------------- | -------------------------------- | ---------------------- | ---------------------------------------------------- |
| `PREFIX`                            | `prefix`                         | `.,!,#`                | Comma-separated; parsed into an array.               |
| `SESSION_ID`                        | `session.id`                     | `default`              | Alphanumeric + hyphens only.                         |
| `SESSION_STORE_PATH`                | `session.storePath`              | `./.auth/state.sqlite` |                                                      |
| `SESSION_DEVICE_BROWSER`            | `session.deviceBrowser`          | `edge`                 | zapo `WA_BROWSERS` value.                            |
| `SESSION_OS_DISPLAY_NAME`           | `session.deviceOsDisplayName`    | `Windows`              | OS name shown in _Linked Devices_.                   |
| `SESSION_PAIRING`                   | `session.pairing`                | `qr`                   | `qr` \| `code` (enforced).                           |
| `SESSION_PHONE_NUMBER`              | `session.phoneNumber`            | `''`                   | Required when `pairing` is `code`. Digits only.      |
| `SESSION_AUTO_RECONNECT`            | `session.autoReconnect`          | `true`                 |                                                      |
| `SESSION_MAX_RECONNECT_ATTEMPTS`    | `session.maxReconnectAttempts`   | `10`                   |                                                      |
| `SESSION_MARK_ONLINE_ON_CONNECT`    | `session.markOnlineOnConnect`    | `false`                |                                                      |
| `AUTO_STICKER_ENABLED`              | `autoSticker.enabled`            | `false`                |                                                      |
| `AUTO_STICKER_VIDEO_DURATION_LIMIT` | `autoSticker.videoDurationLimit` | `10`                   |                                                      |
| `AUTO_STICKER_PACKNAME`             | `autoSticker.packname`           | `Bot Sticker`          |                                                      |
| `AUTO_STICKER_AUTHOR`               | `autoSticker.author`             | `Developer`            |                                                      |
| `BOT_DEVELOPER_NUMBER`              | `developer.numbers`              | `''`                   | Comma-separated; parsed into an array.               |
| `SELF_BOT_ENABLED`                  | `selfBot.enabled`                | `false`                |                                                      |
| `PENDING_COMMAND_TIMEOUT`           | `pendingCommand.timeout`         | `60000`                |                                                      |
| `EVAL_MODE`                         | `eval.mode`                      | `safe`                 | `safe` \| `full` (enforced).                         |
| `EVAL_TIMEOUT`                      | `eval.timeoutMs`                 | `5000`                 |                                                      |
| `EVAL_MAX_OUTPUT`                   | `eval.maxOutput`                 | `4000`                 |                                                      |
| `EXEC_SANDBOX_MODE`                 | `exec.mode`                      | `auto`                 | `auto` \| `docker` \| `podman` \| `host` (enforced). |
| `EXEC_SANDBOX_IMAGE`                | `exec.image`                     | `debian:bookworm-slim` |                                                      |
| `EXEC_TIMEOUT`                      | `exec.timeoutMs`                 | `15000`                |                                                      |
| `EXEC_MAX_OUTPUT`                   | `exec.maxOutput`                 | `4000`                 |                                                      |
| `EXEC_SANDBOX_MEMORY`               | `exec.memory`                    | `256m`                 |                                                      |
| `EXEC_SANDBOX_CPUS`                 | `exec.cpus`                      | `0.5`                  |                                                      |
| `EXEC_SANDBOX_PIDS_LIMIT`           | `exec.pidsLimit`                 | `64`                   |                                                      |
| `EXEC_SANDBOX_NETWORK`              | `exec.network`                   | `false`                |                                                      |
| `EXEC_SANDBOX_READONLY`             | `exec.readOnly`                  | `true`                 |                                                      |
| `EXEC_SANDBOX_USER`                 | `exec.user`                      | `65534:65534`          |                                                      |
| `PLUGINS_DIRECTORY`                 | `plugins.directory`              | `./src/plugins`        |                                                      |
| `LOG_LEVEL`                         | `logger.level`                   | `info`                 | `trace` \| `debug` \| `info` \| `warn` \| `error`.   |
| `LOG_PRETTY`                        | `logger.pretty`                  | `true`                 |                                                      |
| `LOG_NAME`                          | `logger.name`                    | `ZapBot`               |                                                      |

## Prefix configuration

`config/prefix.js` returns a `string[]`:

```js
export default ['.', '!', '#']; // built from PREFIX=".,!,#"
```

- **Multiple prefixes** (`['.', '!', '#']`): any of them is accepted, e.g. `.ping`, `!ping`, `#menu` all resolve to the same `ping`/`menu` commands.
- Prefixes are matched with a plain `String#startsWith`, longest-match-agnostic, so pick prefixes that don't collide (`.` and `..` together would be ambiguous).
- `getPrefixes()` normalizes a single string to a one-element array for you, so `ctx.config.getPrefixes()` is always `string[]`.

### Changing the prefix without restarting

`ctx.config` is mutable at runtime:

```js
// from any plugin or event module with access to ctx
ctx.config.set('prefix', ['.', '/']);
```

The next incoming message picks up the new prefix list immediately: `events/message.js` reads `ctx.config.getPrefixes()` fresh on every message, it never caches the array. This is what lets you build, for example, an admin-only `.setprefix` command plugin without touching core files or restarting the process.

## Session configuration

```js
// config/session.js
export default {
   id: 'default',
   storePath: './.auth/state.sqlite',
   deviceBrowser: 'edge', // zapo WA_BROWSERS: 'chrome' | 'chromium' | 'firefox' | 'safari' | 'ie' | 'opera' | 'edge'
   deviceOsDisplayName: 'Windows',
   pairing: 'qr', // 'qr' | 'code'
   phoneNumber: '', // required when pairing === 'code'
   autoReconnect: true,
   maxReconnectAttempts: 10,
   markOnlineOnConnect: false,
};
```

- `id` is forwarded to zapo's `WaClient` as `sessionId`: it keys every store domain (auth, signal, messages, ...). Changing it between runs orphans the previous credentials; run multiple bot instances by giving each a distinct `id` **and** `storePath`.
- `deviceBrowser` must be one of zapo's `WA_BROWSERS` values (`src/core/ClientWrapper.js` imports the enum from `zapo-js/protocol`); it drives the _Linked Devices_ label shown on the phone and the companion platform id sent during pairing.
- `deviceOsDisplayName` is the OS name shown in _Linked Devices_ (e.g. `Windows`, `Mac OS`, `Android`).
- `markOnlineOnConnect` controls zapo's `markOnlineOnConnect` option: `true` broadcasts online presence to every contact on every connect; `false` (the default) keeps a headless bot invisible, matching WhatsApp Web with an unfocused tab.
- `autoReconnect` / `maxReconnectAttempts` control `core/ClientWrapper.js`'s exponential-backoff reconnect loop, used only for transient drops (`connection: close` with `isLogout: false`). A real logout (device unlinked from the phone) never auto-reconnects; you must re-pair.

### WaClient options not driven by config

`ClientWrapper#createClient()` also passes a handful of zapo `WaClient` options that are **hard-coded in the constructor**, not read from `config/*.js`. Editing config won't change these; edit `src/core/ClientWrapper.js` directly:

| Option                                         | Current value   | Why it matters (per zapo's docs)                                                                                                                                                                                                                                         |
| ---------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `history: { enabled, requireFullSync }`        | `true` / `true` | `requireFullSync: true` requests the **full** chat history from the phone on every fresh pair instead of just recent chats, slow and bandwidth-heavy on large accounts. Only keep it on if you actually consume `history_sync_chunk` events.                             |
| `media.generate*` / `normalizeVoiceNote`       | all `true`      | Each flag depends on the `@zapo-js/media-utils` processor, which in turn needs `sharp` plus a system `ffmpeg`/`ffprobe` on `PATH`. Missing binaries fail generation silently per-message rather than at boot, verify they're installed before shipping with all enabled. |
| `plugins: [wamPlugin({ syntheticUi: false })]` | on              | Registers zapo's own client-level addon plugin (unrelated to this framework's `plugins.directory` command/event loader; don't confuse the two).                                                                                                                          |

Store providers (`store.providers` inside `createClient()`) are likewise hard-coded to `'sqlite'` for every domain. Set a domain to `'none'` (e.g. `messages: 'none'`) to skip persisting that archive, or swap the backend key if you install a different `@zapo-js/store-*` package.

### Full `WaClient` options reference

zapo's `WaClient` accepts far more than what `createClient()` currently wires up (full source: [zapo.to/en/concepts/configuration](https://zapo.to/en/concepts/configuration)). Use this as a lookup when extending `ClientWrapper.js`: pass extra keys straight into the first `new WaClient({ ... })` argument, and expose them via a new `config/*.js` file following the existing `config('session.x', fallback)` pattern.

**Required**

| Option      | Notes                                                                                  |
| ----------- | -------------------------------------------------------------------------------------- |
| `store`     | Built via `createStore`, holds every per-session domain (auth, signal, messages, ...). |
| `sessionId` | Stable id keying every store domain; changing it orphans existing credentials.         |

**Device & version**

| Option                    | Default        | Notes                                                                        |
| ------------------------- | -------------- | ---------------------------------------------------------------------------- |
| `deviceBrowser`           | `'chrome'`     | See `WA_BROWSERS`; already wired via `session.deviceBrowser`.                |
| `devicePlatform`          | inferred       | Numeric companion platform override for non-browser platforms.               |
| `deviceOsDisplayName`     | current OS     | Already wired via `session.deviceOsDisplayName`.                             |
| `version`                 | tested default | Dotted-numeric string or async resolver; wrong part-count throws on connect. |
| `recoverFromClientTooOld` | `false`        | Auto re-fetch version + reconnect on HTTP 405 `failure_client_too_old`.      |

**Timeouts (ms)**

| Option                           | Default | Purpose                                                 |
| -------------------------------- | ------- | ------------------------------------------------------- |
| `iqTimeoutMs`                    | 60s     | Generic IQ query timeout.                               |
| `nodeQueryTimeoutMs`             | n/a     | Raw node `query()` calls.                               |
| `keepAliveIntervalMs`            | n/a     | Interval between keep-alive pings.                      |
| `deadSocketTimeoutMs`            | n/a     | No-reply grace period before forcing a reconnect.       |
| `mediaTimeoutMs`                 | n/a     | Media upload/download requests.                         |
| `appStateSyncTimeoutMs`          | n/a     | App-state sync IQ rounds.                               |
| `signalFetchKeyBundlesTimeoutMs` | n/a     | Signal prekey-bundle fetches.                           |
| `messageAckTimeoutMs`            | n/a     | Wait for the server `<ack>` per `message.send` attempt. |
| `messageMaxAttempts`             | n/a     | Max attempts before `message.send` gives up.            |
| `messageRetryDelayMs`            | n/a     | Delay between send retries.                             |

**History & addons**

| Option                     | Default | Notes                                                                                                                            |
| -------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `history.enabled`          | `true`  | Already wired; process `historySyncNotification` chunks.                                                                         |
| `history.requireFullSync`  | `false` | Already wired (forced `true` here); full vs. recent-only backfill.                                                               |
| `addons.autoDecrypt`       | `true`  | Decrypt reactions/poll-votes/edits into typed `message_addon` events automatically.                                              |
| `addons.persistAllSecrets` | `false` | Persist every message's secret (not just poll/event ones) so addons stay decryptable after restart even with `messages: 'none'`. |

**Media & link preview**

| Option                                                                                             | Notes                                                                                     |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `media.processor`                                                                                  | `WaMediaProcessor` instance (e.g. `@zapo-js/media-utils`); already wired.                 |
| `media.generateThumbnail` / `generateWaveform` / `generateStickerThumbnail` / `normalizeVoiceNote` | Per-feature flags, see table above.                                                       |
| `linkPreview.enabled`                                                                              | Global default for `text` message auto-fetch; per-send `linkPreview` option overrides it. |
| `linkPreview.fetchTimeoutMs` / `maxHtmlBytes` / `maxThumbnailBytes`                                | Guardrails against slow/huge pages.                                                       |
| `linkPreview.allowPrivateHosts`                                                                    | `false` by default; keep it off to avoid SSRF against your own network.                   |
| `linkPreview.fetcher` / `userAgent` / `proxy`                                                      | Swap in a custom fetcher or route it through a proxy.                                     |

**Persistence tuning**

| Option                                                                  | Notes                                                                                                                                     |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `writeBehind.maxPendingKeys` / `maxWriteConcurrency` / `flushTimeoutMs` | How long incoming messages batch before flushing to `messages`/`threads`/`contacts`.                                                      |
| `chatEvents.emitSnapshotMutations`                                      | `false` by default; re-emit `app_state_mutation` for historical snapshot mutations too.                                                   |
| `privacyToken.tcToken*`                                                 | Trusted-contact token cache lifetime/bucketing.                                                                                           |
| `logoutStoreClear`                                                      | Per-domain override of what `logout()` wipes: mailbox (`messages`/`threads`/`contacts`) is preserved by default, everything else cleared. |

**Networking & extensibility**

| Option                                                       | Notes                                                                         |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `proxy.ws` / `mediaUpload` / `mediaDownload` / `linkPreview` | Independent proxy per transport leg.                                          |
| `chatSocketUrls`                                             | Override the WebSocket endpoint list (e.g. to target a fake server in tests). |
| `plugins`                                                    | Array of `WaClientPluginDefinition`s; already used for `wamPlugin`.           |
| `signPasskeyAssertion`                                       | External WebAuthn signer for server-forced passkey ("Shortcake") pairing.     |

**Escape hatches (do not enable in production)**

| Option                        | Notes                                                                                                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `testHooks.noiseRootCa`       | Swap the noise cert-chain root CA for testing against a fake server.                                                                                                             |
| `dangerous.*` (auth + client) | Disable individual signature/HMAC/MAC verifications (noise cert chain, ADV signature, sender-key signature, app-state MACs, media MACs). Each one removes a real security check. |

### Plugins: `wamPlugin` (`@zapo-js/wam`)

`ClientWrapper.js` registers `wamPlugin({ syntheticUi: false })`. It emits WhatsApp Web's own `w:stats` (**WAM**) telemetry batches so a headless session's wire fingerprint matches a real WA Web tab more closely; it is a **parity feature, not observability for your bot** (see [zapo.to/en/guides/wam](https://zapo.to/en/guides/wam)).

| Option                              | Default       | Notes                                                                                                                                                                                                  |
| ----------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `autoEmit`                          | `true`        | Auto-captures real protocol/integrator events (connects, sends, app-state changes); no fabrication.                                                                                                    |
| `syntheticUi`                       | `false`       | Fabricates plausible `UiAction` events (chat opens, image views, ...) so the profile doesn't look "sends-only". Set to `true` to enable, or pass an options object to tune probabilities/active hours. |
| `flushIntervalMs` / `maxBufferSize` | 5000ms / 50KB | Coalescing window / size threshold before a batch uploads.                                                                                                                                             |
| `appVersion`                        | `WA_VERSION`  | Override the advertised app version in batches.                                                                                                                                                        |
| `serviceImprovementOptOut`          | `false`       | Consent bit sent with each batch.                                                                                                                                                                      |

Inside `syntheticUi`, the capability gates `channels` / `communities` / `business` default to **`false`**: only flip one on if the paired account genuinely has that surface; firing e.g. a channel event on an account without channels is a detectable tell. Batches only upload once connected **and** `credentials.meJid` is populated (registration complete): anything committed before that is silently dropped, not queued.

Exposed at `this.client.wam` (three methods): `commit(name, payload)` to inject a WAM event manually, `flush()` to force an upload, `dispose()` on shutdown. The plugin is entirely optional; messaging/calling works with it removed from `plugins: []`.

## Sticker configuration

`config/autoSticker.js`:

```js
export default {
   enabled: false, // master switch for automatic conversion
   videoDurationLimit: 10, // seconds; longer videos are ignored
   packname: 'Bot Sticker', // WebP EXIF pack name
   author: 'Developer', // WebP EXIF author
};
```

- `enabled: false` (the default) disables `events/stickerConverter.js` entirely: incoming media is inspected (for the `media`/`image`/`video`/`gif` bus events) but never auto-converted.
- `videoDurationLimit` only applies to videos; GIFs (a video message with `gifPlayback: true`) always convert regardless of length, matching WhatsApp's own GIF semantics (they're short by construction).
- `packname`/`author` are also the defaults used by the manual `.sticker` command plugin (`src/plugins/sticker/index.js`) unless it's edited to use its own values.

## Self bot (owner-only) configuration

`config/selfBot.js`:

```js
export default {
   enabled: false, // master switch for owner-only mode
};
```

- `enabled: false` (the default) means everyone can use the bot.
- `enabled: true` turns on owner-only mode: every incoming message must come from the bot's own account (its own number, i.e. `fromMe`) or from a number listed in `developer.numbers` (`BOT_DEVELOPER_NUMBER`). Anything else is rejected — the middleware halts the chain by _not_ calling `next()` (it does **not** throw), so no command runs and no message is sent back.

The gate is implemented as a middleware at `src/middlewares/selfBot.js`, registered in `src/index.js` via `bot.use(selfBotGuard)`. It reads `selfBot.enabled` fresh on every message through the global `config()` helper (`config('selfBot.enabled', false)`). Because it reads the boot-time config rather than `ctx.config`, calling `ctx.config.set('selfBot.enabled', true)` at runtime does **not** affect this gate — change `config/selfBot.js` or `SELF_BOT_ENABLED` instead.

## Developer configuration

`config/developer.js` returns the list of numbers allowed to run `developer`-category plugins (`eval`, `exec`):

```js
export default {
   numbers: [], // from BOT_DEVELOPER_NUMBER, e.g. "6281234567890,6289876543210"
};
```

- Each entry must be digits only, with country code; the category is matched from each message's `senderJid`.
- Keep these out of source control (the `.env` value is git-ignored), and leave it empty on a public bot.

## Pending command configuration

`config/pendingCommand.js`:

```js
export default {
   timeout: 60_000, // ms a pending command waits for the user's next message
};
```

Controls `core/PendingCommandManager.js`, the transient in-memory store used by plugins that need a follow-up message (e.g. "send me the image now"). The timeout can also be overridden per-entry via `ctx.pending.wait(command, kinds, { timeout })`.

## Eval sandbox configuration

`config/eval.js` controls the developer-only `eval` command (`src/plugins/developer/eval.js`):

```js
export default {
   mode: 'safe', // 'safe' | 'full'
   timeoutMs: 5000,
   maxOutput: 4000,
};
```

- `mode: 'safe'` (default) runs code in an isolated `vm` context inside a worker thread, with no Node host globals (`process`, `require`, `fs`, `fetch`, ...). A runaway is hard-killed via `worker.terminate()`, and a `process.exit()` escape only takes down the worker, never the bot.
- `mode: 'full'` runs a **native `eval` in the bot process** — full access to process globals and the plugin's own module variables, and **no isolation**: `process.exit()` kills the bot and an infinite loop freezes it. Use at your own risk.
- The per-invocation `--safe` / `--full` flag overrides `mode` for that one evaluation.

## Exec sandbox configuration

`config/exec.js`:

```js
export default {
   mode: 'auto', // 'auto' | 'docker' | 'podman' | 'host'
   image: 'debian:bookworm-slim',
   timeoutMs: 15000,
   maxOutput: 4000,
   memory: '256m',
   cpus: '0.5',
   pidsLimit: 64,
   network: false,
   readOnly: true,
   user: '65534:65534',
};
```

Controls the developer-only `exec`/`shell` command (`src/plugins/developer/exec.js`). That plugin **replaced the old binary allowlist** with an actual sandbox: the command is executed inside a throwaway container so a malicious command cannot touch the host.

- `mode` picks the runtime:
   - `auto` (default) — probe for `docker`, then `podman`; if neither is installed, **fall back to running the command directly on the host** (unsandboxed). The plugin warns loudly when this happens.
   - `docker` / `podman` — require that runtime and refuse to run if it's missing.
   - `host` — explicit opt-out: run on the host with only a timeout and output cap, no isolation. Use only if you accept the risk.
- The container is built with `--rm --cap-drop=ALL --security-opt=no-new-privileges`, resource caps (`memory`/`cpus`/`pidsLimit`), an unprivileged `user`, `--network=none` (unless `network: true`), a read-only rootfs (unless `readOnly: false`) with a bounded tmpfs at `/tmp` as the working directory, and no host volume mounts. `timeout` is PID 1 inside the container, so a runaway is always killed at `timeoutMs` even if the CLI is interrupted.
- `image` must contain `bash` and `timeout` (both are present in the default `debian:bookworm-slim` and in most Debian/Alpine images).

### Sandbox approaches other than Docker

Docker is only the default; the plugin's `mode` already supports **Podman** as a drop-in, rootless alternative (`mode: 'podman'`, same flags). Other isolation options you can wire in by editing `containerArgs()` in the plugin file:

| Approach                   | What it is                                                        | Strengths / tradeoffs                                                          |
| -------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Podman**                 | Rootless, daemonless OCI runtime, CLI-compatible with Docker.     | Drop-in here (`mode: 'podman'`); no root daemon = smaller attack surface.      |
| **nsjail**                 | Google's process jail (namespaces + seccomp + cgroups + rlimits). | Very light, no image pull, ideal for single commands; needs a small wrapper.   |
| **bubblewrap**             | Unprivileged sandbox used by Flatpak (bwrap).                     | No daemon/root; great for one-shot commands; you assemble the namespace flags. |
| **firejail**               | SUID sandboxing with easy profiles.                               | Simple CLI (`firejail --noprofile --net=none ...`); SUID binary is its caveat. |
| **gVisor/runsc**           | User-space kernel ("sandboxed container") under Docker/Podman.    | Stronger than runc isolation; swap the runtime instead of changing code.       |
| **systemd-nspawn**         | Lightweight container manager (systemd systems only).             | No image registry needed (`-D` a directory); Linux/systemd hosts only.         |
| **WSL2 / Windows Sandbox** | Windows-native isolation (this bot's dev OS).                     | `wsl -e bash -c ...` or Windows Sandbox config; Windows-only.                  |

## Plugin configuration

`config/plugins.js`:

```js
export default {
   directory: './src/plugins',
};
```

`core/PluginManager.js` recursively scans `plugins.directory` for `.js` files at boot: each file is a self-contained plugin (see [plugin-development.md](./plugin-development.md)), no separate metadata file. Point this at a different directory to load a separate plugin set (for example, per-deployment plugin bundles) without touching the framework itself.

## Logger configuration

`config/logger.js`:

```js
export default {
   level: 'info', // 'trace' | 'debug' | 'info' | 'warn' | 'error'
   pretty: true, // pretty-print to console (requires pino-pretty)
   name: 'ZapBot',
};
```

Controls `core/Logger.js`'s verbosity for both the framework's own logs and (indirectly, see [api-reference.md](./api-reference.md#logger)) anything logged through `ctx.logger`. `level` is validated against the allowed set by `envalid` at boot.
