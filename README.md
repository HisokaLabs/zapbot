<h1 align="center">ZapBot</h1>

ZapBot is an event-driven, plugin-based WhatsApp bot framework for Node.js, built on top of [`zapo-js`](https://github.com/vinikjkkj/zapo). There is no `commandHandler()`, no `switch(command)` and no static prefix table anywhere in the codebase: every feature is a listener on an internal event bus and every command is a `Map` entry a plugin registers when it loads.

<p align="center">
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-2E8B57?style=for-the-badge" alt="License: MIT" />
  </a>
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/badge/node.js-20.9%2B-339933?logo=node.js&style=for-the-badge" alt="Node.js 20.9+" />
  </a>
  <a href="https://github.com/GIScience/badges#active">
    <img src="https://img.shields.io/badge/status-active-2ECC71?style=for-the-badge" alt="Status: active" />
  </a>
</p>

## Disclaimer

**IMPORTANT**: ZapBot is a framework provided for educational and personal use. If you build and run a bot with it, please:

- **Use responsibly**: Don't spam, harass or send unwanted messages to users.
- **Respect privacy**: Handle user data with care.
- **No commercial use** Without proper authorization.
- **Legal compliance**: Ensure your use complies with local laws, regulations and WhatsApp's own terms of service.

The maintainers are not responsible for any misuse of bots built with ZapBot or any consequences arising from their use.

> [!CAUTION]
> WhatsApp may suspend or ban accounts that violate their terms of service. Use at your own risk.

## Why ZapBot?

- **Plugin-based, zero-config**: Drop a single `.js` file into `src/plugins/<category>/` and it's live. No `plugin.json` and no core file ever needs to change just to add a command.
- **Autoloaders for both plugins and events**: `src/core/PluginManager.js` and `src/events/index.js#loadEvents` recursively scan their directories and register whatever they find.
- **Event-driven**: `message`, `command`, `media`, `image`, `video`, `gif`, `sticker`, `connection`, `ready` and any custom event a plugin wants to emit, all on one bus (`ctx.events`).
- **`parseMessage` built in**: Every incoming message is normalized once into `text`, `isMedia`, `isType(kind)`, `isGroup`, `quoted`, `mentions` and bound `send`/`reply` helpers.
- **Middleware support**: Koa-style `bot.use(async (ctx, next) => { ... await next() })` for logging, anti-spam, permissions.
- **Multi-prefix, hot-reloadable**: `.`, `!`, `#` by default; change the prefix list at runtime via `ctx.config`, no restart needed.
- **Automatic sticker conversion**: Opt-in event listener that turns incoming images/GIFs/short videos into stickers.
- **Default plugins**: `ping`, `menu` (reads the live plugin/command list, grouped by category, never hardcoded), `sticker`.
- **No build step**: Plain modern JavaScript (ESM), one JSDoc type file at the project root ([`types.js`](./types.js)), no `.d.ts`, no `tsconfig`/`jsconfig`, no compiler. Module aliases come from Node's native `package.json#imports`.

## Prerequisites

- **Node.js >= 20.9.0** (required by `zapo-js`).
- **ffmpeg** on `PATH`: required by `wa-sticker-formatter` to convert video/GIF input into stickers. Not needed if you only send/convert static images.
- **Git**, to clone the repository.
- A terminal that can render QR codes or a phone ready to enter an 8-character pairing code instead.

**Verify installation:**

```bash
node --version
npm --version
git --version
```

See [docs/installation.md](./docs/installation.md) for full details, including a Windows-specific native-module note for `better-sqlite3`/`sharp`.

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/DikaArdnt/zapbot.git
cd zapbot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Everything lives in [`config/config.js`](./config/config.js) with sane defaults; no environment variable is required to get started. Copy `.env.example` to `.env` (git-ignored) if you want to override settings like `session.phoneNumber` or `session.pairing` without editing the config file directly.

### 4. Run the bot

```bash
npm start        
npm run dev
```

### 5. Connect WhatsApp

- **QR pairing** (default): A QR code prints in your terminal. Open **WhatsApp → Linked devices → Link a device** and scan it.
- **Pairing code**: Set `session.pairing: 'code'` and `session.phoneNumber` in `config/config.js`, then start the bot; an 8-character code prints in the terminal.

Once paired, credentials are persisted to `session.storePath` (default `./.auth/state.sqlite`), so subsequent `npm start` runs reconnect automatically.

## Configuration

ZapBot reads its configuration from [`config/config.js`](./config/config.js), where every field can be overridden by an environment variable (loaded via `dotenv`):

| Field                            | Env variable                       | Description                                                    | Default                  |
| --------------------------------- | ----------------------------------- | ---------------------------------------------------------------- | ------------------------- |
| `prefix`                          | `PREFIX`                           | Comma-separated list of command prefixes                        | `['.', '!', '#']`         |
| `session.id`                      | `SESSION_ID`                       | Logical session identifier forwarded to `WaClient`               | `default`                 |
| `session.storePath`               | `SESSION_STORE_PATH`               | Where the SQLite auth/session store is persisted                 | `./.auth/state.sqlite`    |
| `session.deviceBrowser`           | `SESSION_DEVICE_BROWSER`           | Device browser name forwarded to `WaClient`                      | `edge`                    |
| `session.pairing`                 | `SESSION_PAIRING`                  | `'qr'` or `'code'`                                               | `qr`                      |
| `session.phoneNumber`             | `SESSION_PHONE_NUMBER`             | Required when `pairing` is `'code'` (digits + country code)      | (empty)                   |
| `session.autoReconnect`           | `SESSION_AUTO_RECONNECT`           | Reconnect automatically after a non-logout disconnect             | `true`                    |
| `session.maxReconnectAttempts`    | `SESSION_MAX_RECONNECT_ATTEMPTS`   | Maximum reconnect attempts before giving up                       | `10`                      |
| `session.markOnlineOnConnect`     | `SESSION_MARK_ONLINE_ON_CONNECT`   | Whether to mark the account as online on connect                  | `false`                   |
| `autoSticker.enabled`             | `AUTO_STICKER_ENABLED`             | Master switch for automatic sticker conversion                    | `false`                   |
| `autoSticker.videoDurationLimit`  | `AUTO_STICKER_VIDEO_DURATION_LIMIT`| Videos longer than this (seconds) are ignored, not converted     | `10`                      |
| `autoSticker.packname`            | `AUTO_STICKER_PACKNAME`            | Sticker pack name embedded in WebP EXIF metadata                  | `Bot Sticker`             |
| `autoSticker.author`              | `AUTO_STICKER_AUTHOR`              | Sticker author embedded in WebP EXIF metadata                     | `Developer`               |
| `plugins.directory`               | `PLUGINS_DIRECTORY`                | Directory recursively scanned for plugin files                    | `./src/plugins`           |
| `logger.level`                    | `LOG_LEVEL`                        | `'trace'` \| `'debug'` \| `'info'` \| `'warn'` \| `'error'`       | `info`                    |
| `logger.pretty`                   | `LOG_PRETTY`                       | Pretty-print logs to the console (requires `pino-pretty`)         | `true`                    |
| `logger.name`                     | `LOG_NAME`                         | Name of the logger included in each log line                      | `ZapBot`                  |

Full reference: [docs/configuration.md](./docs/configuration.md).

## Project structure

```
config/config.js        # the only config file (prefix, session, autoSticker, plugins, logger)
types.js                 # single root JSDoc type file (#types alias)
eslint.config.js         # ESLint flat config (import-x order rules + prettier integration)
.prettierrc.json         # Prettier config (LF line endings, no semicolons, single quotes)
src/
├── core/                # Bot, ConfigManager, EventManager, MiddlewareManager,
│                         # CommandManager, PluginManager, ClientWrapper, Logger
├── events/               # autoloaded: message.js, media.js, stickerConverter.js, connection.js, index.js (loader)
├── plugins/
│   ├── main/             # ping.js, menu.js
│   └── media/             # sticker.js
├── utils/                # helper.js, media.js, sticker.js, parseMessage.js, loader.js
└── index.js               # boots Bot with config/config.js
```

| Path                          | Purpose                                                                    |
| ------------------------------ | --------------------------------------------------------------------------- |
| [src/core](src/core)           | The framework itself: `Bot`, `ConfigManager`, `EventManager`, `MiddlewareManager`, `CommandManager`, `PluginManager`, `ClientWrapper`, `Logger` |
| [src/events](src/events)       | Built-in event modules, autoloaded at boot by `src/events/index.js#loadEvents` |
| [src/plugins](src/plugins)     | User-facing features, one file per plugin, autoloaded by `PluginManager`   |
| [src/utils](src/utils)         | Pure, stateless helpers shared by core/events/plugins                     |
| [config/config.js](config/config.js) | The single source of runtime configuration                          |
| [types.js](types.js)           | Single root JSDoc type file, referenced via `import('#types').SomeType`   |

## Module resolution

There's no bundler and no `jsconfig.json`/`tsconfig.json`. Aliases come from `package.json`'s native `"imports"` field:

```json
"imports": {
  "#types": "./types.js",
  "#config": "./config/config.js",
  "#core/*.js": "./src/core/*.js",
  "#events/*.js": "./src/events/*.js",
  "#plugins/*.js": "./src/plugins/*.js",
  "#utils/*.js": "./src/utils/*.js"
}
```

Always import through these aliases, never relative `../../` chains.

## Plugin example

A plugin is a single file, `src/plugins/<category>/<name>.js`, default-exporting a `BotPlugin` (see [`types.js`](./types.js)):

```js
/* src/plugins/main/hello.js */

/** @type {import('#types').BotPlugin} */
export default {
   name: 'hello',
   type: 'command',
   commands: ['hello'],
   description: 'Say hello',

   init(ctx) {
      ctx.logger.debug('hello plugin initialized');
   },

   async execute(command) {
      await command.reply(`Hello, ${command.pushName ?? 'there'}!`);
   },
};
```

That's it: `.hello` works and shows up in `.menu` under the `main` category automatically. No metadata file, no registration step. More in [docs/plugin-development.md](./docs/plugin-development.md).

## Event example

```js
/* src/events/myFeature.js */

/** @type {import('#types').BotEventModule} */
export default {
   name: 'autoStickerOnImage',

   register(ctx) {
      ctx.events.on('image', async mediaContext => {
         if (!ctx.config.get('autoSticker.enabled')) return;
         const bytes = await mediaContext.downloadBytes();
         const sticker = await ctx.utils.sticker.createSticker(Buffer.from(bytes));
         await ctx.wa.reply(mediaContext.raw, {
            type: 'sticker',
            media: sticker,
            mimetype: 'image/webp',
         });
      });
   },
};
```

Drop it in `src/events/` and it's autoloaded, no `src/events/index.js` edit required. More in [docs/event-development.md](./docs/event-development.md).

## Default plugins

The plugin loader recursively scans [src/plugins](src/plugins). Currently shipped:

- `main`: `ping`, `menu` (lists every loaded plugin/command, grouped by category, generated live rather than hardcoded)
- `media`: `sticker`

## Linting & formatting

ESLint (with [`eslint-plugin-import-x`](https://github.com/un-ts/eslint-plugin-import-x) for import ordering) and Prettier (LF line endings enforced via `.prettierrc.json`/`.editorconfig`/`.gitattributes`):

```bash
npm run lint          # check
npm run lint:fix      # check + autofix (also sorts/groups imports: node: -> packages -> #alias -> relative)
npm run format         # prettier --write
npm run format:check   # prettier --check, no writes
```

## Verification

You'll know the bot is running when you see, in order (from `src/core/Bot.js`, `src/core/ClientWrapper.js` and `src/events/connection.js`):

- `Command prefixes: . ! #` and `Registered commands: ping, menu, sticker` (or your own) logged at startup.
- Either `Scan the QR code below within <N>s` with a rendered QR code or `Pairing code: XXXX-XXXX`, depending on `session.pairing`.
- `Paired as <jid> (<pushName>)` once WhatsApp accepts the pairing.
- `Connected (new login: true/false)` and `Bot is ready — <N> plugin(s) loaded.`
- The bot replying to `.ping`, `.menu` or `.sticker` (reply to an image) in a chat.

## Common Failure Points

**WhatsApp connection drops**

- `ClientWrapper.scheduleReconnect()` retries with exponential backoff (`1000 * 2^attempt`, capped at 30s) up to `session.maxReconnectAttempts` (default `10`), only when `session.autoReconnect` is `true`.
- After the max attempts is reached, it logs `Giving up reconnecting after <N> attempts.` and stops; there is no further automatic recovery.
- If the session is logged out, `ClientWrapper` logs the specific reason (`FAILURE_LOCKED`, `FAILURE_BANNED`, `FAILURE_CLIENT_TOO_OLD`, `FAILURE_SERVICE_UNAVAILABLE`, `STREAM_ERROR_DEVICE_REMOVED` or a generic re-pairing message) and you'll need to re-pair by restarting the bot.

**Plugin or command errors**

- `CommandManager.dispatch()` wraps every `plugin.execute()` call in `try/catch`; a thrown error is logged (`Plugin "<name>" threw while executing "<command>"`) but does not crash the bot or the message loop.
- `PluginManager.registerPlugin()` skips (with a warning) any plugin missing `name`/`init`, any `type: 'command'` plugin missing `commands[]` or `execute()` and any plugin with `enabled: false`.

**Auth/session issues**

- Session state is persisted to `session.storePath` (default `./.auth/state.sqlite`) via `@zapo-js/store-sqlite`. If pairing seems stuck or corrupted, stop the bot and delete that file to force a fresh pairing.

**Native module install failures (`better-sqlite3`, `sharp`)**

- See the [Windows native modules note](./docs/installation.md#windows-native-modules): switching to a current Node LTS with prebuilt binaries is the fastest fix.

## Running Tests

This project has no automated test suite. Changes are verified manually:

1. Start the bot with `npm start` (or `npm run dev` to auto-restart on file changes).
2. Pair a WhatsApp account (QR or code, see [Quick Start](#5-connect-whatsapp)).
3. Trigger the relevant command or event (e.g. send `.ping`, `.menu` or `.sticker` in a chat or reproduce the event condition your change affects).
4. Confirm the expected reply/log output, per the [Verification](#verification) section above.

Before opening a pull request, also run:

```bash
npm run lint
npm run format:check
```

## Documentation

- [docs/installation.md](./docs/installation.md)
- [docs/configuration.md](./docs/configuration.md)
- [docs/plugin-development.md](./docs/plugin-development.md)
- [docs/event-development.md](./docs/event-development.md)
- [docs/api-reference.md](./docs/api-reference.md)
- [docs/examples.md](./docs/examples.md)
- [AGENTS.md](./AGENTS.md): Coding rules and architecture guide for contributors (human or AI).
- [CONTRIBUTING.md](./CONTRIBUTING.md): How to fork, branch and submit a pull request.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow: forking, coding rules, commit message conventions ([Conventional Commits](https://www.conventionalcommits.org/)) and how to open a pull request against [DikaArdnt/zapbot](https://github.com/DikaArdnt/zapbot).

## License

[MIT LICENSE](./LICENSE).
