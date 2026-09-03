# API Reference 📖

Full type definitions live in [`/types.js`](../types.js): a single root-level file of JSDoc `@typedef`s (no `.d.ts`, no build step, no type-checking pipeline). This document is a human-readable tour of the same surface. Every core/plugin/event file references it via `@typedef {import('#types').X}` / `@param {import('#types').X}`, so your editor gives you hover info and autocomplete from the same source.

## Import aliases

Module resolution uses Node's native `package.json#imports` field, no `jsconfig.json`, no bundler:

```json
"imports": {
  "#types": "./types.js",
  "#config/*.js": "./config/*.js",
  "#core/*.js": "./src/core/*.js",
  "#events/*.js": "./src/events/*.js",
  "#middlewares/*.js": "./src/middlewares/*.js",
  "#plugins/*.js": "./src/plugins/*.js",
  "#utils/*.js": "./src/utils/*.js"
}
```

```js
import { Bot } from '#core/Bot.js';
import { parseMessage } from '#utils/parseMessage.js';
import config from '#config/index.js';
```

These resolve identically regardless of which file imports them: no more counting `../../` segments.

## Bot API

`core/Bot.js`, the framework entry point.

```js
import { Bot } from '#core/Bot.js';
import config from '#config/index.js';

const bot = new Bot(config);

bot.use(async (message, next) => {
   /* middleware: message is a MessageContext */
   await next();
});
await bot.start(); // autoloads events, autoloads plugins, connects to WhatsApp
await bot.stop(); // graceful disconnect (keeps credentials)
```

| Member                                                                                                 | Signature                    | Notes                                                                            |
| ------------------------------------------------------------------------------------------------------ | ---------------------------- | -------------------------------------------------------------------------------- |
| `new Bot(config)`                                                                                      | `(config: BotConfig) => Bot` | Constructs every core manager and the zapo client wrapper. Does not connect yet. |
| `bot.use(middleware)`                                                                                  | `(mw: Middleware) => void`   | Shorthand for `bot.middleware.use(mw)`.                                          |
| `bot.buildContext()`                                                                                   | `() => BotContext`           | Returns the memoized shared context (same object every call).                    |
| `bot.start()`                                                                                          | `() => Promise<void>`        | Autoloads `src/events/*.js`, autoloads `src/plugins/**/*.js`, connects.          |
| `bot.stop()`                                                                                           | `() => Promise<void>`        | Disconnects without clearing stored credentials.                                 |
| `bot.config` / `bot.logger` / `bot.events` / `bot.commands` / `bot.pending` / `bot.plugins` / `bot.wa` | n/a                          | Direct access to each core manager, same instances exposed on `ctx`.             |

## Context API

`BotContext` (see [plugin-development.md](./plugin-development.md#plugin-api) for the member table) is the object passed to every plugin's `init` and every event module's `register`. It is built once by `Bot.buildContext()` and reused: mutating something reachable from `ctx` (e.g. `ctx.config.set(...)`) is visible everywhere immediately. Middleware receive a `MessageContext` instead — its `message.ctx` field is that same `BotContext` (see [Middleware](#middleware)).

### `MessageContext` / `CommandContext`

Built by `utils/parseMessage.js` for every inbound message, before prefix detection: this is the piece that makes pulling `text`, `isMedia`, `isType`, `isGroup`, `quoted`, `mentions`, etc. off a message a one-liner instead of re-inspecting the raw protobuf:

```js
{
  raw,          // the original zapo WaIncomingMessageEvent
  ctx,          // the shared BotContext
  key,          // WaMessageKey
  id,           // stanza id
  chatJid,      // conversation JID
  senderJid,    // participant in groups, remoteJid in 1:1
  isGroup,      // boolean
  fromMe,       // boolean
  pushName,     // string | undefined
  text,         // extracted text, trimmed
  type,         // 'text' | 'image' | 'video' | 'gif' | 'audio' | 'ptt' | 'document' | 'sticker' | 'poll' | 'location' | 'contact' | 'unknown'
  isMedia,      // boolean
  isType(kind), // (kind) => boolean (shorthand for `type === kind`)
  mimetype,     // string | undefined
  seconds,      // number | undefined (video/audio duration)
  quoted,       // { message, type } | undefined
  mentions,     // string[]
  send(content, options?),   // send into the originating chat
  reply(content, options?)   // reply (quoting this message) into the originating chat
}
```

`CommandContext` is the same object with `prefix`, `command`, `args` added once a message matches a registered command.

**Parsing notes (per zapo's docs, read before relying on these fields):**

- `chatJid`/`senderJid` prefer `event.key.remoteJidAlt`/`participantAlt` over `remoteJid`/`participant`. zapo surfaces both PN (phone-number) and LID addressing on a message; using the alt form keeps the same contact resolving to the same JID string regardless of which addressing mode WhatsApp used for that particular stanza. If you persist JIDs yourself, normalize them the same way before comparing.
- `text` only reads `conversation`, `extendedTextMessage.text`, and the current content type's `caption` (`utils/media.js#extractText`): polls, locations, contacts, and reactions have no plain-text body and yield `''`. Always check `type`/`isType()` before trusting `text` on non-text messages.
- `event.message` can be `undefined` (e.g. protocol/unavailable messages): `parseMessage` handles that defensively (`type: 'unknown'`, `text: ''`), but a plugin reading `raw.message.*` directly must guard for it too.
- `quoted`/`mentions` are read from the message's `contextInfo`, which only exists on content-bearing kinds (text, media, poll, event...): expect `undefined`/`[]` on reactions, receipts, and protocol messages.

### `MediaContext`

Built by `events/media.js` for any message carrying an attachment:

```js
{
   (raw,
      ctx,
      type, // 'image' | 'video' | 'gif' | 'audio' | 'sticker' | 'document'
      mimetype, // string | undefined
      seconds, // number | undefined
      caption, // string | undefined
      downloadToFile(filePath), // stream to disk
      downloadBytes()); // buffer in memory (small media only)
}
```

## Middleware

Middleware run in order against every inbound message, before command parsing and before `messageCreate`/`message`/`command` events are emitted. They form a Koa-style onion stack managed by `core/MiddlewareManager.js`.

```js
/** @type {import('#types').Middleware} */
async function myMiddleware(message, next) {
   // message is a MessageContext (message.ctx is the BotContext)

   if (shouldReject(message)) return; // halt: no next(), no command, no reply

   message.text = message.text.trim(); // transform before the rest of the chain

   const result = await next(); // continue; resolves to the downstream return value
   return result;
}

bot.use(myMiddleware); // shorthand for bot.middleware.use(myMiddleware)
```

- `message` is the parsed `MessageContext` (see above).
- `next()` continues the chain and resolves to whatever the downstream middleware/final handler returned. Call it at most once — calling it twice throws.
- **Halt** the chain by returning without calling `next()`: downstream middleware, command dispatch, and the message events never run, and no reply is sent (`src/middlewares/selfBot.js` does this).
- **Transform** by mutating `message` before `next()` (e.g. `shoutTransform` in `src/middlewares/testing.js`).
- **Lifecycle** by `await next()` and using the result (e.g. `timingLifecycle` in `src/middlewares/testing.js`).

`bot.use(mw)` is shorthand for `bot.middleware.use(mw)`. `ctx.middleware.execute(message, final?)` runs the whole stack with an optional final handler — `events/message.js` passes `processMessage` as that final step.

## Plugin API

See [plugin-development.md](./plugin-development.md). The contract (`import('#types').BotPlugin`):

```js
{
  name: string,
  type: 'command' | 'event',
  commands: string[] | undefined,   // required when type === 'command'
  description: string | undefined,
  enabled: boolean | undefined,     // defaults to true
  init(ctx) { /* ... */ },
  async execute(command) { /* ... */ }  // required when type === 'command'
}
```

## Utility API

`ctx.utils` groups the pure-function helper modules, none of them touch the network or hold state.

### `utils/parseMessage.js`

| Function                   | Signature                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `parseMessage(event, ctx)` | `(WaIncomingMessageEvent, BotContext) => MessageContext`, also exposed directly as `ctx.utils.parseMessage`. |

### `utils/helper.js`

| Function                          | Signature                                                 |
| --------------------------------- | --------------------------------------------------------- |
| `sleep(ms)`                       | `(number) => Promise<void>`                               |
| `formatBytes(bytes, decimals?)`   | `(number, number?) => string`                             |
| `formatDuration(ms)`              | `(number) => string`                                      |
| `parseCommand(text, prefix)`      | `(string, string) => { command: string, args: string[] }` |
| `matchPrefix(text, prefixes)`     | `(string, string[]) => string \| undefined`               |
| `safeJsonParse(input, fallback?)` | `(string, unknown?) => unknown`                           |
| `truncate(text, maxLength)`       | `(string, number) => string`                              |

### `utils/media.js`

| Function                           | Signature                                              |
| ---------------------------------- | ------------------------------------------------------ |
| `extractText(message)`             | `(Proto.IMessage?) => string`                          |
| `getMessageKind(message)`          | `(Proto.IMessage?) => MessageKind`                     |
| `hasMedia(message)`                | `(Proto.IMessage?) => boolean`                         |
| `getMediaDurationSeconds(message)` | `(Proto.IMessage?) => number \| undefined`             |
| `getMediaMimetype(message)`        | `(Proto.IMessage?) => string \| undefined`             |
| `isAnimatedSticker(message)`       | `(Proto.IMessage?) => boolean`                         |
| `getContextInfo(message)`          | `(Proto.IMessage?) => Proto.IContextInfo \| undefined` |
| `getQuotedMessage(message)`        | `(Proto.IMessage?) => Proto.IMessage \| undefined`     |
| `getMentionedJids(message)`        | `(Proto.IMessage?) => string[]`                        |

### `utils/sticker.js`

`sharp` encodes static images; `ffmpeg` converts video/GIF.

| Function                          | Signature                                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `createSticker(buffer, options?)` | `(Buffer, StickerOptions?) => Promise<Buffer>`, WebP-encoded sticker bytes with pack EXIF metadata.         |
| `buildSticker(data, options?)`    | `(Buffer, { pack?, author?, isSticker?, isVideo?, imageOptions? }?) => Promise<Buffer>`, low-level builder. |
| `buildExif(pack?, author?)`       | `(string?, string?) => Buffer`, the WhatsApp sticker pack EXIF blob.                                        |
| `injectWebPEXIF(input, exif)`     | `(Buffer, Buffer) => Buffer`, attaches the EXIF chunk to a WebP (pure RIFF rewrite).                        |
| `toWebP512(data, options?)`       | `(Buffer, { quality?, fit? }?) => Promise<Buffer>`, static image → 512x512 WebP.                            |
| `videoToWebP(data)`               | `(Buffer) => Promise<Buffer>`, video/GIF → animated WebP via ffmpeg.                                        |

### `utils/loader.js`

The shared engine behind both autoloaders (`core/PluginManager.js` and `events/index.js`'s `loadEvents`):

| Function                                  | Signature                                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `findJsFiles(directory, options?)`        | `(string, { exclude?: string[] }?) => Promise<string[]>`, recursively collects `.js` file paths, sorted.                                    |
| `loadDefaultExports(directory, options?)` | `(string, { exclude?: string[] }?) => Promise<{ filePath, module }[]>`, dynamically imports each file found and returns its default export. |

## Core managers (advanced / internal)

Reach for these directly only when `ctx`'s convenience surface doesn't cover what you need, normal plugins should not need to import `core/*` files.

| Class                   | File                            | Responsibility                                                                            |
| ----------------------- | ------------------------------- | ----------------------------------------------------------------------------------------- |
| `ConfigManager`         | `core/ConfigManager.js`         | Dot-path config get/set + `"change"` events.                                              |
| `Logger`                | `core/Logger.js`                | Implements zapo's `Logger` interface; also usable standalone.                             |
| `EventManager`          | `core/EventManager.js`          | The internal event bus (extends `EventEmitter`).                                          |
| `MiddlewareManager`     | `core/MiddlewareManager.js`     | Koa-style onion middleware stack.                                                         |
| `CommandManager`        | `core/CommandManager.js`        | Command name → plugin `Map`, dispatch.                                                    |
| `PendingCommandManager` | `core/PendingCommandManager.js` | In-memory `chatId+userId` → pending-command store (`wait`/`set`/`get`/`consume`/`clear`). |
| `PluginManager`         | `core/PluginManager.js`         | Recursive filesystem plugin autoloader (category folders, no metadata file).              |
| `ClientWrapper`         | `core/ClientWrapper.js`         | Owns the zapo `WaClient`, store, pairing, reconnect.                                      |
| `Bot`                   | `core/Bot.js`                   | Wires everything above together; the only file `src/index.js` imports.                    |
