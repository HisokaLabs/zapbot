See @AGENTS.md for architecture, coding rules, plugin/event conventions, and commit message format. It applies equally to Claude and to human contributors.

## Docs map

- [docs/installation.md](./docs/installation.md): setup, running the bot.
- [docs/configuration.md](./docs/configuration.md): `config/config.js` reference.
- [docs/plugin-development.md](./docs/plugin-development.md): writing a `BotPlugin`.
- [docs/event-development.md](./docs/event-development.md): the event bus, writing a `BotEventModule`.
- [docs/api-reference.md](./docs/api-reference.md): Bot/Context/Plugin/Utility API.
- [types.js](./types.js): the single source of truth for shared JSDoc types (`#types`).

## Before finishing a change

Run `npm run lint` and `npm run format:check`; fix with `npm run lint:fix` / `npm run format` rather than hand-formatting.
