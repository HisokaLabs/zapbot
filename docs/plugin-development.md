# Plugin Development 🔌

A plugin is a **single `.js` file** anywhere under `plugins.directory` (default `src/plugins/`), default-exporting a `BotPlugin` object (see [`/types.js`](../types.js)). There is no separate metadata file: `name`, `version`, `author`, `description`, and `enabled` all live directly on the export.

```
src/plugins/
├── main/
│   ├── ping.js
│   └── menu.js
└── media/
    └── sticker.js
```

The subfolder a plugin lives in (`main`, `media`, ...) is its **category**: pure organization, picked up automatically by `core/PluginManager.js`'s recursive autoloader and used by the `menu` plugin to group commands. It carries no other meaning; group plugins however makes sense for your bot (`main/`, `admin/`, `fun/`, `ai/`, ...).

Dropping a new file in is the **only** step required: no core file, no `src/index.js`, no other plugin needs to change. The autoloader discovers it on the next boot.

## Creating a new plugin

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

That's the whole plugin. Restart the bot (`npm run dev` restarts automatically on save) and `.hello` works, showing up in `.menu` automatically under the `main` category: the menu plugin reads the live command list from `ctx.plugins.list()`, it never hardcodes anything.

### Disabling a plugin

Set `enabled: false` on the export instead of deleting the file:

```js
export default {
   name: 'hello',
   type: 'command',
   commands: ['hello'],
   enabled: false,
   // ...
};
```

The autoloader logs and skips it.

## Command plugins

`type: 'command'` plugins declare `commands: string[]` (the trigger words, without a prefix) and an `execute(command)` method. They are **not** wired through a `switch(command)`: `core/CommandManager.js` registers each command name into a `Map` at load time and does a lookup at dispatch time. Adding a command means adding a plugin file, never editing a dispatcher.

`execute` receives a `CommandContext`, a `MessageContext` (see below) plus the parsed command:

```js
async execute(command) {
  command.prefix   // '.' (whichever prefix matched)
  command.command  // 'hello' (the command name, no prefix)
  command.args     // ['a', 'b'] (whitespace-split arguments)
  command.text     // 'a b' (full text after the command, trimmed)
  command.chatJid   // conversation JID
  command.isGroup   // boolean
  command.isMedia   // true if the triggering message itself carries media
  command.quoted    // the message this one replies to, if any: { message, type }
  await command.reply('...')  // quotes the triggering message
  await command.send('...')   // plain send, no quote
}
```

See [api-reference.md](./api-reference.md#messagecontext--commandcontext) for the full field list: every field comes from `utils/parseMessage.js`.

### Pending commands (multi-step input)

When a command needs follow-up input that isn't on the triggering message (e.g. `.sticker` typed with no media attached), register a **pending command** with the one-liner `ctx.pending.wait(command, ...)` instead of hardcoding a "wait for next message" flow. The message handler then resumes the _same_ `execute()` on the user's next message — no duplicate handler, no `.sticker` re-typed by the user.

```js
async execute(command) {
   const { ctx } = command;

   if (!hasEnoughInput(command)) {
      // Waits for an image on the user's next message. Chat/user/command/
      // prefix/args are reused automatically from `command`.
      ctx.pending.wait(command, 'image');
      await command.reply('Send me an image to continue.');
      return;
   }

   // ... normal handling ...
}
```

`wait(command, expectedInput, options?)` accepts one kind or a list:

```js
ctx.pending.wait(command, 'image'); // single kind
ctx.pending.wait(command, ['image', 'gif', 'video']); // any of these
ctx.pending.wait(command, 'text', { data: { targetLang: 'id' } }); // + extra context
```

`options.data` is forwarded onto the resumed `command` (read it back as a field inside `execute`); `options.timeout` overrides the default 60s expiry for that one entry.

The longer `ctx.pending.set({ chatId, userId, command, prefix, args, expectedInput, data, timeout })` form still exists for cases where you need full manual control (e.g. setting a pending command for a user other than the message sender).

How it behaves, automatically (see `events/message.js`):

- **Awaited input arrives** → the pending command is consumed and `execute()` is called again with the new message as `command` (so `command.raw`, `command.quoted`, `command.isMedia`, ... reflect the follow-up message, while `command.command`/`args`/`prefix` are the original invocation). The follow-up message is _not_ processed as a normal message again, so there's no double response.
- **Wrong input arrives** (e.g. text when waiting for `'image'`) → the pending command is dropped and the message flows through as a normal message.
- **A new command arrives** → the pending command is dropped and the new command runs.
- **Timeout** (default 60s, `pendingCommand.timeout` in config) → the pending command is dropped lazily on the next message.

`expectedInput` matches the `MessageKind` of the message itself _or_ its quoted message, so `wait(command, ['image', 'gif', 'video'])` accepts both "send an image" and "reply to an image with a caption".

A few ready-made examples:

```js
// Wait for a single image.
ctx.pending.wait(command, 'image');

// Wait for any of several media kinds.
ctx.pending.wait(command, ['image', 'gif', 'video']);

// Wait for plain text, passing extra context through.
ctx.pending.wait(command, 'text', { data: { targetLang: 'id' } });
```

State is **in-memory only** (`core/PendingCommandManager.js`): it is lost on restart and not persisted to the database — pending input is only meaningful within a short conversation window anyway.

## Event plugins

`type: 'event'` plugins don't declare `commands`; instead, `init(ctx)` subscribes to whatever bus events it cares about, directly:

```js
// src/plugins/main/welcome.js

/** @type {import('#types').BotPlugin} */
export default {
   name: 'welcome',
   type: 'event',
   description: 'Greets new group members',

   init(ctx) {
      ctx.events.on('messageCreate', messageContext => {
         // react to every normalized incoming message
      });
   },
};
```

See [event-development.md](./event-development.md) for the full event list and payload shapes.

## Plugin lifecycle

1. **Discovery**: `PluginManager.load()` recursively walks `plugins.directory` collecting every `.js` file (`src/utils/loader.js`'s `findJsFiles`).
2. **Import**: each file's default export is imported and validated (must have `name` + `init()`; `type: 'command'` plugins must additionally have `execute()` and a non-empty `commands[]`). A file that doesn't export a valid `BotPlugin` is logged and skipped.
3. **Enabled check**: `enabled === false` skips the plugin (still counted as discovered, never imported into a working plugin).
4. **Init**: `plugin.init(ctx)` runs once, in file-discovery order (alphabetical by path). This is where event plugins call `ctx.events.on(...)`.
5. **Registration**: `type: 'command'` plugins are registered into `CommandManager` right after `init()` returns.

A plugin that throws during `init()` is logged and skipped: it does not crash the bot or block other plugins from loading.

## Plugin API

Every plugin's `init(ctx)` and `execute(command)` receives the shared `BotContext` (or a `CommandContext`, which extends `MessageContext`, which carries `ctx`). Highlights:

| Member                                   | Purpose                                                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `ctx.client`                             | The raw zapo `WaClient`, an escape hatch for anything not covered below.                                 |
| `ctx.wa`                                 | `ClientWrapper`: `sendMessage`, `reply`, `downloadToFile`, `downloadBytes`, `connect`, `disconnect`.     |
| `ctx.config`                             | `get(path, fallback)`, `set(path, value)`, `getPrefixes()`.                                              |
| `ctx.logger`                             | `trace/debug/info/warn/error/success`, `.child({ scope })`.                                              |
| `ctx.plugins`                            | `list()` (each entry has `{ plugin, category, filePath }`), `get(name)`, `count()`.                      |
| `ctx.commands`                           | `has(name)`, `list()`: read-only introspection.                                                          |
| `ctx.pending`                            | Pending-command store: `wait()`, `set()`, `get()`, `consume()`, `clear()` (see below).                   |
| `ctx.events`                             | The internal event bus: `on/once/off/emit`.                                                              |
| `ctx.middleware`                         | `use(fn)`: register cross-cutting middleware.                                                            |
| `ctx.utils`                              | `helper`, `media`, `sticker`, `parseMessage`: the pure-function utility modules.                         |
| `ctx.sendMessage(jid, content, options)` | Send into an arbitrary chat, not tied to an incoming message.                                            |
| `ctx.registerCommand(plugin)`            | Register a `BotPlugin` programmatically, bypassing the filesystem loader.                                |
| `ctx.registerEvent(eventModule)`         | Register a `BotEventModule` programmatically.                                                            |
| `ctx.downloadMedia(event, filePath?)`    | Download media from a raw incoming event: streams to a file when `filePath` is given, buffers otherwise. |

See [api-reference.md](./api-reference.md) for full signatures.

## Plugin rules (see also [AGENTS.md](../AGENTS.md))

- One plugin, one file, one responsibility.
- No plugin-to-plugin imports. If two plugins need to share logic, put it in `src/utils/` and have both import from `#utils/*.js`.
- No global mutable state outside `ctx`: a plugin's own module scope may hold private state (e.g. a cooldown `Map`), but never reach into another plugin's internals.
- Never `import` a core file (`src/core/*`) directly from a plugin; everything a plugin needs is reachable through `ctx`.
- Use the `#core/*.js`, `#utils/*.js`, `#events/*.js`, `#plugins/*.js`, `#types`, `#config` import aliases (defined in `package.json`'s `"imports"` field) instead of relative `../../` paths.
