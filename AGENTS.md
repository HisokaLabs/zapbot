# AGENTS.md

Guideline for any AI coding agent (or human) working in this repository.

## Project Overview

This is an event-driven, plugin-based WhatsApp bot framework built on [`zapo-js`](https://github.com/vinikjkkj/zapo). The architecture in one line: **everything is a listener on an event bus**, there is no `commandHandler()`, no `switch(command)`, no static prefix handler anywhere in the codebase.

```
Incoming WhatsApp message (zapo WaClient)
        |
core/ClientWrapper.js   : bridges zapo events onto the internal bus
        |  emits "raw_message"
events/message.js       : parseMessage() -> middleware -> emit "messageCreate"/"message"
        |                  -> prefix/command parse -> emit "command" -> CommandManager.dispatch()
events/media.js         : emits "media" / "image" / "video" / "gif" / "sticker"
        |
events/stickerConverter.js, plugins/**, your own event modules: all just ctx.events.on(...) listeners
```

Layers:

- **`src/core/`**: the framework itself (`Bot`, `ConfigManager`, `EventManager`, `MiddlewareManager`, `CommandManager`, `PluginManager`, `ClientWrapper`, `Logger`). This is the only place that should ever need architectural changes.
- **`src/events/`**: built-in event modules, **autoloaded** at boot by `src/events/index.js#loadEvents(ctx)` (recursively scans `src/events/*.js`, imports, calls `register(ctx)`). No manual registration list to maintain.
- **`src/plugins/<category>/<name>.js`**: user-facing features, one file per plugin, **autoloaded** by `core/PluginManager.js` (recursively scans `plugins.directory`). No `plugin.json`; every field (`name`, `type`, `commands`, `version`, `author`, `enabled`) lives directly on the file's default export. The subfolder is the plugin's `category`, pure organization.
- **`src/utils/`**: pure, stateless helper functions shared by core/events/plugins, including `parseMessage.js` (normalizes a raw event into `text`/`isMedia`/`isType`/`isGroup`/`quoted`/`mentions`/...) and `loader.js` (the shared autoloader engine both `PluginManager` and `loadEvents` build on).
- **`/types.js`** (project root): the single source of truth for every shared JSDoc type (`BotPlugin`, `BotContext`, `MessageContext`, `CommandContext`, `MediaContext`, `BotConfig`, ...). Referenced from any file via `import('#types').SomeType`. Not a `.d.ts`, no type-checking pipeline; it exists purely for editor hover/autocomplete.

## Module resolution

There is no `jsconfig.json`/`tsconfig.json` and no bundler. Aliases come from `package.json`'s native `"imports"` field:

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

Always import via these aliases (`#core/Bot.js`, `#utils/helper.js`, ...), never relative `../../` chains; they resolve identically no matter how deep the importing file lives.

## Coding Rules

- **Language**: plain modern JavaScript (ESM, `import`/`export`), not TypeScript. No build step; the framework runs directly with `node`.
- **Document exports with JSDoc** (`@param`, `@returns`, `@type`, `@typedef`). Reference shared types from `/types.js` via `import('#types').SomeType`; never redefine a shared shape locally. There is no `// @ts-check` pragma and no type-checking CI step; JSDoc here is documentation and editor hover, not enforcement, so don't let type-fidelity concerns block a change, correctness is verified by running the code.
- **`async`/`await` everywhere**, no raw `.then()` chains in framework code.
- **Don't change `src/core/*` without a real reason.** If a task can be done by adding a plugin, an event module, or a utility function, do that instead of touching core. Core changes should be rare and deliberate.
- **Plugins must stay isolated** (see below): no plugin-to-plugin imports, no reaching into another plugin's internals.
- **Events must stay reusable**: a payload shape, once shipped, is a contract; don't silently change it (see Event Rules).
- **No `switch(command)`, no `commandHandler()`, no static prefix table.** Commands are `Map` entries populated by plugin registration (`core/CommandManager.js`); prefixes come from `ctx.config.getPrefixes()`, read fresh on every message so they can change at runtime.
- Keep functions small and single-purpose; prefer composing small pure functions in `src/utils/` over large stateful classes.
- Code style (2-space indent, single quotes, no semicolons, LF line endings) is enforced by ESLint + Prettier, not by hand; run `npm run lint` / `npm run format` before committing. Import order (`node:` builtins → external packages → `#`-aliased internal → relative) is enforced by `eslint-plugin-import-x` and auto-fixable with `npm run lint:fix`. See [`eslint.config.js`](./eslint.config.js), [`.prettierrc.json`](./.prettierrc.json), and [`.editorconfig`](./.editorconfig).

## Plugin Rules

Every plugin is a single file, `src/plugins/<category>/<name>.js`, default-exporting a `BotPlugin` (see `/types.js`). Wajib:

- Have `name`, `type`, and `init(ctx)` on the export. `type: 'command'` plugins additionally need `commands: string[]` and `execute(command)`.
- Not create a global/module-level dependency shared with another plugin; if two plugins need the same logic, extract it to `src/utils/`, not to one plugin importing from another.
- Not access core files (`src/core/*`) directly; everything a plugin needs is reachable through the `ctx: BotContext` passed to `init(ctx)`/`execute(command)`.
- Fail gracefully; wrap risky I/O (downloads, external APIs) in `try/catch` and reply with a user-facing error instead of throwing (an uncaught throw inside `execute()` is caught and logged by `CommandManager`, but the user just sees nothing happen, which is a worse experience than an error message).
- Prefer `command.quoted` / `command.isMedia` / `command.isType(kind)` (from `parseMessage`) over re-parsing `command.raw.message` by hand.
- To disable a plugin without deleting it, set `enabled: false` on the export; don't gate it with a comment-out.

## Event Rules

A new event (in `src/events/`, autoloaded automatically, or emitted ad hoc by a plugin via `ctx.events.emit(...)`) must:

- Have a clear, namespaced name; built-ins are bare (`message`, `media`, `command`), plugin-defined custom events should be prefixed (`myplugin:something`) to avoid collisions.
- Have its payload shape documented with a JSDoc `@typedef` in `/types.js` if more than one file will consume it.
- Not introduce a breaking change to an existing built-in event's payload (`MessageContext`, `CommandContext`, `MediaContext`, or any `WaIncomingMessageEvent`-derived shape). Add fields; don't remove or repurpose them. If a real breaking change is unavoidable, it belongs in a major version bump with a changelog entry, not a silent edit.

## Commit Rules

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     a new feature (a new plugin, a new event, a new core capability)
fix:      a bug fix
docs:     documentation only
refactor: code change that neither fixes a bug nor adds a feature
```

Keep the subject line imperative and under ~72 chars, e.g. `feat: add downloader plugin`, `fix: correct video duration check in stickerConverter`.
