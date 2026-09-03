# WhatsApp Bot Framework 🤖

An event-driven, plugin-based WhatsApp bot framework for Node.js, built on top of [`zapo-js`](https://github.com/vinikjkkj/zapo). The framework uses an internal event bus, dynamic plugin loading, and command mapping to create a modular and extensible WhatsApp bot architecture.

## Features ✨

- **Plugin-based architecture**: Add new functionality by creating a single `.js` file inside `src/plugins/<category>/`. Plugins are discovered automatically and integrated into the bot lifecycle.

- **Automatic plugin and event loading**: `core/PluginManager.js` and `events/index.js#loadEvents` recursively scan their directories and load available modules automatically.

- **Event-driven system**: Handle `message`, `command`, `media`, `image`, `video`, `gif`, `sticker`, `connection`, `ready`, and custom events through a unified event bus available from `ctx.events`.

- **Built-in message parser**: Every incoming message is normalized through `parseMessage` into a consistent structure containing `text`, `isMedia`, `isType(kind)`, `isGroup`, `quoted`, `mentions`, and helper methods such as `send` and `reply`.

- **Middleware support**: Extend bot behavior with Koa-style middleware:

```js
bot.use(async (ctx, next) => {
   await next();
});
```

Useful for logging, anti-spam systems, permissions, and shared request handling.

- **Flexible prefix configuration**: Supports multiple command prefixes and runtime prefix updates through configuration management.

- **Automatic sticker conversion**: Optional event-based sticker conversion for supported image, GIF, and short video messages.

- **Built-in plugins**: Includes default plugins such as `ping`, `menu`, and `sticker`. The menu dynamically reads registered plugins and commands, organized by category.

- **Lightweight JSDoc workflow**: Uses a root [`types.js`](./types.js) file for type definitions with native Node.js module aliases from `package.json#imports`.

## Installation ⚙️

```bash
npm install

npm start
```

See [`docs/installation.md`](./docs/installation.md) for prerequisites such as Node.js version requirements, `ffmpeg` installation for video stickers, and platform-specific notes.

## Linting & formatting 🧹

Uses ESLint with [`eslint-plugin-import-x`](https://github.com/un-ts/eslint-plugin-import-x) for import ordering and categorization, combined with Prettier formatting rules.

```bash
npm run lint          # check

npm run lint:fix      # check + autofix

npm run format        # format files

npm run format:check  # verify formatting
```

## Configuration 🔧

Configuration is Laravel-style: each section lives in its own file under [`config/`](./config/), and [`config/index.js`](./config/index.js) autoloads them all into a single object exposed through the `config(key, fallback)` helper:

```js
config('session.pairing', 'qr'); // 'qr'
config('prefix'); // ['.', '!', '#']
```

Configuration values can be overridden through environment variables using `dotenv` + `envalid`. Copy [`.env.example`](./.env.example) to `.env` for deployment-specific settings such as session configuration.

Full reference: [`docs/configuration.md`](./docs/configuration.md)

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

The plugin is loaded automatically, registered as a command, and becomes available through the command system.

More details: [`docs/plugin-development.md`](./docs/plugin-development.md)

## Event example ⚡

```js
// src/events/myFeature.js

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

Event modules inside `src/events/` are automatically loaded and connected to the event system.

More details: [`docs/event-development.md`](./docs/event-development.md)

## Project layout 🗂️

```
config/                # Laravel-style config (one file per section + index.js loader)

types.js                # root JSDoc type definitions

eslint.config.js        # ESLint configuration

.prettierrc.json        # Prettier configuration

src/

├── core/               # Bot, ConfigManager, EventManager,
│                       # MiddlewareManager, CommandManager,
│                       # PluginManager, ClientWrapper, Logger
│
├── events/             # event modules and event loader
│
├── plugins/
│   ├── main/           # default command plugins
│   └── media/          # media-related plugins
│
├── utils/              # shared utilities
│
└── index.js            # application entry point
```

## Documentation 📚

- [`docs/installation.md`](./docs/installation.md)
- [`docs/configuration.md`](./docs/configuration.md)
- [`docs/plugin-development.md`](./docs/plugin-development.md)
- [`docs/event-development.md`](./docs/event-development.md)
- [`docs/api-reference.md`](./docs/api-reference.md)
- [`docs/examples.md`](./docs/examples.md)
- [`AGENTS.md`](./AGENTS.md): coding rules and architecture guide for contributors.

## License 📄

[MIT License](./LICENSE)
