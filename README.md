# WhatsApp Bot Framework 🤖

An event-driven, plugin-based WhatsApp bot framework for Node.js, built on top of [`zapo-js`](https://github.com/vinikjkkj/zapo). No `commandHandler()`, no `switch(command)`, no static prefix table. Every feature is a listener on an internal event bus, and every command is just a `Map` entry a plugin registers at load time.

## Features ✨

- **Plugin-based, zero-config**: drop a single `.js` file into `src/plugins/<category>/` and it's live. No `plugin.json`, no core file ever needs to change to add a command.
- **Autoloaders for both plugins and events**: `core/PluginManager.js` and `events/index.js#loadEvents` recursively scan their directories and register whatever they find. Nothing to register by hand.
- **Event-driven**: `message`, `command`, `media`, `image`, `video`, `gif`, `sticker`, `connection`, `ready`, and any custom event a plugin wants to emit, all on one bus (`ctx.events`).
- **`parseMessage` built in**: every incoming message is normalized once into `text`, `isMedia`, `isType(kind)`, `isGroup`, `quoted`, `mentions`, and bound `send`/`reply` helpers, instead of every plugin re-inspecting the raw protobuf.
- **Middleware support**: Koa-style `bot.use(async (ctx, next) => { ... await next() })` for logging, anti-spam, permissions.
- **Multi-prefix, hot-reloadable**: `.`, `!`, `#` (or your own) out of the box; change the prefix list at runtime with `ctx.config.set('prefix', [...])`, no restart needed.
- **Automatic sticker conversion**: opt-in event listener that turns incoming images/GIFs/short videos into stickers.
- **Default plugins**: `ping`, `menu` (reads the live plugin/command list, grouped by category, never hardcoded), `sticker`.
- **Lightweight JSDoc, no build step**: one type file at the project root ([`types.js`](./types.js)), no `.d.ts`, no `tsconfig`/`jsconfig`, no compiler. Module aliases come from Node's native `package.json#imports`.

## Installation ⚙️

```bash
npm install
npm start
```

See [docs/installation.md](./docs/installation.md) for prerequisites (Node >= 20.9.0, `ffmpeg` for video stickers, and a Windows-specific native-module note).

## Linting & formatting 🧹

ESLint (with [`eslint-plugin-import-x`](https://github.com/un-ts/eslint-plugin-import-x) for import ordering/categorization) and Prettier (LF line endings enforced via `.prettierrc.json`/`.editorconfig`/`.gitattributes`, so formatting is identical on Windows, macOS, and Linux):

```bash
npm run lint        # check
npm run lint:fix    # check + autofix (also sorts/groups imports: node: -> packages -> #alias -> relative)
npm run format       # prettier --write
npm run format:check # prettier --check, no writes
```

## Configuration 🔧

Everything lives in [`config/config.js`](./config/config.js):

```js
export default {
   prefix: ['.', '!', '#'],
   session: {
      id: 'default',
      storePath: './.auth/state.sqlite',
      pairing: 'qr',
      autoReconnect: true,
      maxReconnectAttempts: 10,
   },
   autoSticker: {
      enabled: false,
      videoDurationLimit: 10,
      packname: 'Bot Sticker',
      author: 'Developer',
   },
   plugins: { directory: './src/plugins' },
   logger: { level: 'info' },
};
```

Every field can be overridden by an environment variable (loaded via `dotenv`) without editing this file: copy [`.env.example`](./.env.example) to `.env` (git-ignored) to set deployment-specific/sensitive values like `session.phoneNumber`.

Full reference: [docs/configuration.md](./docs/configuration.md).

## Plugin example 🔌

```js
// src/plugins/main/hello.js

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

## Event example ⚡

```js
// src/events/myFeature.js, or ctx.registerEvent(...) from any plugin's init(ctx)

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

Drop it in `src/events/` and it's autoloaded: no `src/events/index.js` edit required. More in [docs/event-development.md](./docs/event-development.md).

## Project layout 🗂️

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

## Documentation 📚

- [docs/installation.md](./docs/installation.md)
- [docs/configuration.md](./docs/configuration.md)
- [docs/plugin-development.md](./docs/plugin-development.md)
- [docs/event-development.md](./docs/event-development.md)
- [docs/api-reference.md](./docs/api-reference.md)
- [docs/examples.md](./docs/examples.md)
- [AGENTS.md](./AGENTS.md): coding rules and architecture guide for contributors (human or AI).

## License 📄

MIT
