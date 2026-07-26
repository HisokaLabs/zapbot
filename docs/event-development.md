# Event Development ⚡

Everything in the framework communicates through `core/EventManager.js`, a plain `EventEmitter` exposed as `ctx.events`. There is no central dispatcher that knows about every feature: `events/message.js` emits `"messageCreate"`, `events/media.js` listens for it and emits `"media"`/`"image"`/`"video"`/`"gif"`/`"sticker"`, `events/stickerConverter.js` listens for those, and so on. Adding behavior means adding a listener, not editing a dispatcher.

## Autoloading

`src/events/index.js` exports `loadEvents(ctx)`, which recursively scans `src/events/` (excluding itself) for `.js` files, imports each one's default export, and calls `register(ctx)` on it. `core/Bot.js` calls `loadEvents(ctx)` once at boot, before plugins load and before the client connects. Dropping a new file into `src/events/` is the only step required to add framework-level, always-on behavior; nothing else needs editing.

Registration order doesn't matter: `register(ctx)` only attaches listeners, it never emits, so every module finishes subscribing before the client connects and any real event fires.

## The built-in event names

| Event                                 | Payload                                     | Emitted by                                                                | When                                                                                            |
| ------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `raw_message`                         | `WaIncomingMessageEvent` (zapo's own shape) | `core/ClientWrapper.js`                                                   | Every inbound zapo `message` event, unfiltered.                                                 |
| `messageCreate`                       | `MessageContext`                            | `events/message.js`                                                       | After middleware runs, for every message (including the bot's own, `fromMe: true`).             |
| `message`                             | `MessageContext`                            | `events/message.js`                                                       | Alias of `messageCreate`, emitted right after it; use whichever reads better in your plugin.    |
| `command`                             | `CommandContext`                            | `events/message.js`                                                       | A message matched a configured prefix **and** a registered command name, right before dispatch. |
| `media`                               | `MediaContext`                              | `events/media.js`                                                         | Any message carrying a media attachment (image/video/gif/audio/document/sticker).               |
| `image` / `video` / `gif` / `sticker` | `MediaContext`                              | `events/media.js`                                                         | Focused variants of `media`, one per kind.                                                      |
| `connection`                          | `WaConnectionEvent`                         | `core/ClientWrapper.js`                                                   | Socket opened or closed: `event.status === 'open' \| 'close'`.                                  |
| `ready`                               | `WaConnectionEvent`                         | `core/ClientWrapper.js`                                                   | Shorthand for `connection` with `status === 'open'`.                                            |
| `error`                               | `Error`                                     | anywhere (middleware failures, plugin/event errors, `debug_client_error`) | Something threw outside of a place that can handle it locally.                                  |

Plugins and event modules are free to emit and listen to **custom** event names beyond this list; `ctx.events` has no fixed schema.

## `MessageContext`: parsed once, reused everywhere

Every `messageCreate`/`message`/`command`/media event carries a context object built by `utils/parseMessage.js`. It exists specifically so you never have to re-inspect the raw protobuf:

```js
ctx.events.on('messageCreate', m => {
   m.text; // extracted text, trimmed
   m.isGroup; // boolean
   m.isMedia; // boolean, any attachment present
   m.isType('image'); // shorthand for m.type === 'image'
   m.quoted; // { message, type }, the message this one replies to, if any
   m.mentions; // string[] of mentioned JIDs
   m.senderJid; // participant in groups, remoteJid in 1:1
});
```

`parseMessage(event, ctx)` is also exposed as `ctx.utils.parseMessage` and can be called directly on any raw `WaIncomingMessageEvent` you have lying around (e.g. inside a plugin handling a quoted message manually).

## Creating a new event module

A built-in-style event module is a file exporting a `{ name, register(ctx) }` object:

```js
// src/events/myFeature.js

/** @type {import('#types').BotEventModule} */
export default {
   name: 'myFeature',

   register(ctx) {
      ctx.events.on('messageCreate', messageContext => {
         // ...
      });
   },
};
```

Two ways to wire it in:

1. **Built-in / always-on**: drop the file into `src/events/`: the autoloader picks it up automatically. Reserve this for framework-level behavior you want in every deployment.
2. **From a plugin**: call `ctx.registerEvent(myFeatureModule)` inside any plugin's `init(ctx)`. This is the right choice for bot-specific behavior: it ships with a plugin file and needs no core file edits, exactly like a command plugin.

## Event listener

Listeners are plain functions: `async` is fine, but note `EventEmitter#emit` does not await listeners, so a slow/throwing async listener won't block or crash the emitter. Wrap risky logic in `try/catch` and emit `"error"` yourself if you need centralized error visibility:

```js
ctx.events.on('image', async mediaContext => {
   try {
      await doSomethingWith(mediaContext);
   } catch (error) {
      ctx.events.emit('error', error);
   }
});
```

## Custom events

Nothing stops a plugin from defining and emitting its own event for other plugins to react to: this is the idiomatic way to let plugins compose without importing each other:

```js
// plugin A: detects something and emits a custom event
ctx.events.emit('user:levelUp', { jid, newLevel });

// plugin B: reacts, without knowing anything about plugin A's internals
ctx.events.on('user:levelUp', ({ jid, newLevel }) => {
   ctx.client.sendMessage(jid, `🎉 You reached level ${newLevel}!`);
});
```

Prefix custom event names (`user:levelUp`, `economy:transaction`) to avoid colliding with the built-in names above or another plugin's events.

## Rules for new events (see also [AGENTS.md](../AGENTS.md))

- Give the event module a clear `name`: it shows up in debug logs (`Event module registered: <name>`).
- Document the payload shape with a JSDoc `@typedef` in [`/types.js`](../types.js) when more than one file consumes it.
- Don't rename or change the shape of an existing built-in event's payload: that's a breaking change for every plugin listening to it. Emit a new, differently-named event instead.
