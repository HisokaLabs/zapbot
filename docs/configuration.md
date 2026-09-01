# Configuration 🔧

All runtime behavior is controlled by [`config/config.js`](../config/config.js), a plain ES module default-exporting a `BotConfig` object (see `src/types/index.d.ts`). It is loaded once in `src/index.js` and wrapped by `core/ConfigManager.js`, which every plugin/event/middleware reads through `ctx.config`.

## Overriding values via `.env`

`config.js` loads [`dotenv`](https://www.npmjs.com/package/dotenv) (`import 'dotenv/config'`) before building the config object, so every field can be overridden by an environment variable without editing the file, useful for keeping deployment/account-specific values (like `session.phoneNumber`) out of source control. Copy [`.env.example`](../.env.example) to `.env` (already git-ignored) and fill in what you need; anything left unset falls back to the hardcoded default shown below.

| `.env` variable                     | Config path                      | Default                |
| ----------------------------------- | -------------------------------- | ---------------------- |
| `PREFIX` (comma-separated)          | `prefix`                         | `.,!,#`                |
| `SESSION_ID`                        | `session.id`                     | `default`              |
| `SESSION_STORE_PATH`                | `session.storePath`              | `./.auth/state.sqlite` |
| `SESSION_DEVICE_BROWSER`            | `session.deviceBrowser`          | `edge`                 |
| `SESSION_PAIRING`                   | `session.pairing`                | `qr`                   |
| `SESSION_PHONE_NUMBER`              | `session.phoneNumber`            | `''`                   |
| `SESSION_AUTO_RECONNECT`            | `session.autoReconnect`          | `true`                 |
| `SESSION_MAX_RECONNECT_ATTEMPTS`    | `session.maxReconnectAttempts`   | `10`                   |
| `AUTO_STICKER_ENABLED`              | `autoSticker.enabled`            | `false`                |
| `AUTO_STICKER_VIDEO_DURATION_LIMIT` | `autoSticker.videoDurationLimit` | `10`                   |
| `AUTO_STICKER_PACKNAME`             | `autoSticker.packname`           | `Bot Sticker`          |
| `AUTO_STICKER_AUTHOR`               | `autoSticker.author`             | `Developer`            |
| `BOT_DEVELOPER_NUMBER`              | `developer.numbers`              | `[]`                   |
| `SELF_BOT_ENABLED`                  | `selfBot.enabled`                | `false`                |
| `PENDING_COMMAND_TIMEOUT`           | `pendingCommand.timeout`         | `60000`                |
| `PLUGINS_DIRECTORY`                 | `plugins.directory`              | `./src/plugins`        |
| `LOG_LEVEL`                         | `logger.level`                   | `info`                 |
| `LOG_PRETTY`                        | `logger.pretty`                  | `true`                 |
| `LOG_NAME`                          | `logger.name`                    | `ZapBot`               |

## Prefix configuration

```js
export default {
   prefix: ['.', '!', '#'],
};
```

- **Single prefix**: `prefix: '.'`
- **Multiple prefixes** (`prefix: ['.', '!', '#']`): any of them is accepted, e.g. `.ping`, `!ping`, `#menu` all resolve to the same `ping`/`menu` commands.
- Prefixes are matched with a plain `String#startsWith`, longest-match-agnostic, so pick prefixes that don't collide (`.` and `..` together would be ambiguous).

### Changing the prefix without restarting

`ctx.config` is mutable at runtime:

```js
// from any plugin or event module with access to ctx
ctx.config.set('prefix', ['.', '/']);
```

The next incoming message picks up the new prefix list immediately: `events/message.js` reads `ctx.config.getPrefixes()` fresh on every message, it never caches the array. This is what lets you build, for example, an admin-only `.setprefix` command plugin without touching core files or restarting the process.

## Sticker configuration

```js
export default {
   autoSticker: {
      enabled: false, // master switch for automatic conversion
      videoDurationLimit: 10, // seconds; longer videos are ignored
      packname: 'Bot Sticker', // WebP EXIF pack name
      author: 'Developer', // WebP EXIF author
   },
};
```

- `enabled: false` (the default) disables `events/stickerConverter.js` entirely: incoming media is inspected (for the `media`/`image`/`video`/`gif` bus events) but never auto-converted.
- `videoDurationLimit` only applies to videos; GIFs (a video message with `gifPlayback: true`) always convert regardless of length, matching WhatsApp's own GIF semantics (they're short by construction).
- `packname`/`author` are also the defaults used by the manual `.sticker` command plugin (`src/plugins/sticker/index.js`) unless it's edited to use its own values.

## Self bot (owner-only) configuration

```js
export default {
   selfBot: {
      enabled: false, // master switch for owner-only mode
   },
};
```

- `enabled: false` (the default) means everyone can use the bot.
- `enabled: true` turns on owner-only mode: every incoming message must come from the bot's own account (its own number, i.e. `fromMe`) or from a number listed in `developer.numbers` (`BOT_DEVELOPER_NUMBER`). Anything else is dropped **silently** — the middleware never calls `next()`, so no command runs and no message is sent back.

The gate is implemented as a middleware at `src/middlewares/selfBot.js`, registered in `src/index.js` via `bot.use(selfBotMiddleware)`. It reads `selfBot.enabled` fresh on every message, so you can toggle it at runtime:

```js
ctx.config.set('selfBot.enabled', true);
```

## Session configuration

```js
export default {
   session: {
      id: 'default',
      storePath: './.auth/state.sqlite',
      deviceBrowser: 'edge', // zapo WA_BROWSERS: 'chrome' | 'chromium' | 'firefox' | 'safari' | 'ie' | 'opera' | 'edge'
      pairing: 'qr', // 'qr' | 'code'
      phoneNumber: '', // required when pairing === 'code'
      autoReconnect: true,
      maxReconnectAttempts: 10,
   },
};
```

- `id` is forwarded to zapo's `WaClient` as `sessionId`: it keys every store domain (auth, signal, messages, ...). Changing it between runs orphans the previous credentials; run multiple bot instances by giving each a distinct `id` **and** `storePath`.
- `deviceBrowser` must be one of zapo's `WA_BROWSERS` values (`src/core/ClientWrapper.js` imports the enum from `zapo-js/protocol`); it drives the _Linked Devices_ label shown on the phone and the companion platform id sent during pairing.
- `autoReconnect` / `maxReconnectAttempts` control `core/ClientWrapper.js`'s exponential-backoff reconnect loop, used only for transient drops (`connection: close` with `isLogout: false`). A real logout (device unlinked from the phone) never auto-reconnects; you must re-pair.

### WaClient options not driven by `config.js`

`ClientWrapper#createClient()` also passes a handful of zapo `WaClient` options that are **hard-coded in the constructor**, not read from `config/config.js`. Editing `config.js` won't change these; edit `src/core/ClientWrapper.js` directly:

| Option                                        | Current value   | Why it matters (per zapo's docs)                                                                                                                                                                                                                                              |
| --------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `markOnlineOnConnect`                         | `true`          | zapo defaults this to `false` (announce as unavailable, matching WhatsApp Web with an unfocused tab) so headless bots stay invisible. Forcing `true` broadcasts online presence to every contact on every connect.                                                            |
| `history: { enabled, requireFullSync }`       | `true` / `true` | `requireFullSync: true` requests the **full** chat history from the phone on every fresh pair instead of just recent chats, slow and bandwidth-heavy on large accounts. Only keep it on if you actually consume `history_sync_chunk` events.                                  |
| `media.generate*` / `normalizeVoiceNote`      | all `true`      | Each flag depends on the `@zapo-js/media-utils` processor, which in turn needs `sharp` plus a system `ffmpeg`/`ffprobe` on `PATH`. Missing binaries fail generation silently per-message rather than at boot, verify they're installed before shipping with all four enabled. |
| `plugins: [wamPlugin({ syntheticUi: true })]` | on              | Registers zapo's own client-level addon plugin (unrelated to this framework's `config.plugins.directory` command/event loader; don't confuse the two).                                                                                                                        |

Store providers (`store.providers` inside `createClient()`) are likewise hard-coded to `'sqlite'` for every domain. Set a domain to `'none'` (e.g. `messages: 'none'`) to skip persisting that archive, or swap the backend key if you install a different `@zapo-js/store-*` package.

### Full `WaClient` options reference

zapo's `WaClient` accepts far more than what `createClient()` currently wires up (full source: [zapo.to/en/concepts/configuration](https://zapo.to/en/concepts/configuration)). Use this as a lookup when extending `ClientWrapper.js`: pass extra keys straight into the first `new WaClient({ ... })` argument, and expose them via `config.js` following the existing `config.get('session.x', fallback)` pattern.

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
| `deviceOsDisplayName`     | current OS     | OS name shown in _Linked Devices_.                                           |
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

| Option                                                                                                               | Notes                                                                                     |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `media.processor`                                                                                                    | `WaMediaProcessor` instance (e.g. `@zapo-js/media-utils`); already wired.                 |
| `media.generateThumbnail` / `generateProbe` / `generateWaveform` / `generateStickerThumbnail` / `normalizeVoiceNote` | Per-feature flags, see table above.                                                       |
| `linkPreview.enabled`                                                                                                | Global default for `text` message auto-fetch; per-send `linkPreview` option overrides it. |
| `linkPreview.fetchTimeoutMs` / `maxHtmlBytes` / `maxThumbnailBytes`                                                  | Guardrails against slow/huge pages.                                                       |
| `linkPreview.allowPrivateHosts`                                                                                      | `false` by default; keep it off to avoid SSRF against your own network.                   |
| `linkPreview.fetcher` / `userAgent` / `proxy`                                                                        | Swap in a custom fetcher or route it through a proxy.                                     |

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

`ClientWrapper.js` registers `wamPlugin({ syntheticUi: true })`. It emits WhatsApp Web's own `w:stats` (**WAM**) telemetry batches so a headless session's wire fingerprint matches a real WA Web tab more closely; it is a **parity feature, not observability for your bot** (see [zapo.to/en/guides/wam](https://zapo.to/en/guides/wam)).

| Option                              | Default       | Notes                                                                                                                                                                                             |
| ----------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autoEmit`                          | `true`        | Auto-captures real protocol/integrator events (connects, sends, app-state changes); no fabrication.                                                                                               |
| `syntheticUi`                       | `true`        | Fabricates plausible `UiAction` events (chat opens, image views, ...) so the profile doesn't look "sends-only". Pass `false` to disable, or an options object to tune probabilities/active hours. |
| `flushIntervalMs` / `maxBufferSize` | 5000ms / 50KB | Coalescing window / size threshold before a batch uploads.                                                                                                                                        |
| `appVersion`                        | `WA_VERSION`  | Override the advertised app version in batches.                                                                                                                                                   |
| `serviceImprovementOptOut`          | `false`       | Consent bit sent with each batch.                                                                                                                                                                 |

Inside `syntheticUi`, the capability gates `channels` / `communities` / `business` default to **`false`**: only flip one on if the paired account genuinely has that surface; firing e.g. a channel event on an account without channels is a detectable tell. Batches only upload once connected **and** `credentials.meJid` is populated (registration complete): anything committed before that is silently dropped, not queued.

Exposed at `this.client.wam` (three methods): `commit(name, payload)` to inject a WAM event manually, `flush()` to force an upload, `dispose()` on shutdown. The plugin is entirely optional; messaging/calling works with it removed from `plugins: []`.

## Plugin configuration

```js
export default {
   plugins: {
      directory: './src/plugins',
   },
};
```

`core/PluginManager.js` recursively scans `plugins.directory` for `.js` files at boot: each file is a self-contained plugin (see [plugin-development.md](./plugin-development.md)), no separate metadata file. Point this at a different directory to load a separate plugin set (for example, per-deployment plugin bundles) without touching the framework itself.

## Logger configuration

```js
export default {
   logger: { level: 'info' }, // 'trace' | 'debug' | 'info' | 'warn' | 'error'
};
```

Controls `core/Logger.js`'s verbosity for both the framework's own logs and (indirectly, see [api-reference.md](./api-reference.md#logger)) anything logged through `ctx.logger`.

## Reading config from a plugin or event

```js
// ctx.config.get(path, fallback)
const enabled = ctx.config.get('autoSticker.enabled', false);
const prefixes = ctx.config.getPrefixes(); // always an array, regardless of string|string[] in config.js
```
