# Contributing

Thanks for taking the time to contribute to the WhatsApp Bot Framework.

## Getting started

1. Fork and clone the repository [https://github.com/DikaArdnt/zapbot](https://github.com/DikaArdnt/zapbot).
2. Install dependencies:
   ```bash
   npm install
   ```
   See [docs/installation.md](./docs/installation.md) for prerequisites (Node >= 20.9.0, `ffmpeg`, and a Windows native-module note if `npm install` fails building `better-sqlite3`/`sharp`).
3. Copy `.env.example` to `.env` if you need to override any config field (session/phone number, etc.) without editing the files under `config/` directly.
4. Run the bot to confirm your setup works:
   ```bash
   npm start        # node src/index.js
   npm run dev      # restarts on file changes
   ```

## Before you start coding

Read [AGENTS.md](./AGENTS.md): it's the authoritative guide to this project's architecture, coding rules, plugin rules, and event rules, and it applies to every contributor, human or AI. In short:

- This is plain modern JavaScript (ESM), no build step, no TypeScript. Shared types are documented via JSDoc in [types.js](./types.js), referenced as `import('#types').SomeType`.
- Import via the `#`-aliased paths (`#core/*.js`, `#utils/*.js`, ...) defined in `package.json#imports`, never relative `../../` chains.
- Adding a feature almost always means adding a **plugin** ([docs/plugin-development.md](./docs/plugin-development.md)) or an **event module** ([docs/event-development.md](./docs/event-development.md)); avoid touching `src/core/*` unless the task genuinely requires a framework-level change.
- Plugins must stay isolated: no plugin-to-plugin imports, no reaching into another plugin's internals, no direct `src/core/*` access, only what's reachable through `ctx`.
- An event's payload shape is a contract once shipped: add fields, don't remove or repurpose them.

## Scope: this is a base script — keep changes minimal

This repository is a **base script** built on top of [`zapo-js`](https://github.com/vinikjkkj/zapo). It is meant to stay close to the upstream design so it can keep tracking upstream updates. Therefore:

- ✅ **Welcome:** logical bug fixes, new plugins, new event modules, utility functions, documentation, and config improvements.
- ❌ **Not welcome:** large fundamental rewrites — restructuring the event bus, changing built-in event payload shapes, renaming or redesigning public APIs, or re-architecting `src/core/*` — unless a real, provable bug forces it and the change is discussed in an issue first.
- Fixing a **logical bug** is fine anywhere, including `src/core/*` if that's where the bug lives, but keep the diff as small as possible and explain in the PR why the change is needed.
- The issue and pull request templates (`.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md`) ask you to confirm the scope of your change; please answer those checkboxes honestly.

## Making changes

1. Create a branch for your change.
2. Keep changes focused: one feature/fix per PR.
3. Follow the existing code style: 2-space indent, single quotes, no semicolons, LF line endings. This is enforced by ESLint + Prettier, not by hand:
   ```bash
   npm run lint         # check
   npm run lint:fix     # check + autofix (also sorts/groups imports)
   npm run format       # prettier --write
   npm run format:check # prettier --check, no writes
   ```
   Run `lint` and `format:check` before opening a PR.
4. Manually verify your change against a running bot (send the relevant command/trigger a message and confirm the behavior); there is no automated test suite in this project yet.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     a new feature (a new plugin, a new event, a new core capability)
fix:      a bug fix
docs:     documentation only
refactor: code change that neither fixes a bug nor adds a feature
```

Keep the subject line imperative and under ~72 chars, e.g. `feat: add downloader plugin`, `fix: correct video duration check in stickerConverter`.

## Submitting a pull request

- Push your branch and open a pull request against `main` at [https://github.com/DikaArdnt/zapbot](https://github.com/DikaArdnt/zapbot). The [pull request template](./.github/PULL_REQUEST_TEMPLATE.md) is applied automatically — fill it in, including the scope checkboxes.
- Describe what changed and why; link any related issue.
- Make sure `npm run lint` and `npm run format:check` pass.
- Be ready to answer questions or make revisions during review.

## Reporting bugs / requesting features

Open an issue at [https://github.com/DikaArdnt/zapbot](https://github.com/DikaArdnt/zapbot). The [bug report](./.github/ISSUE_TEMPLATE/bug_report.yml) and [feature request](./.github/ISSUE_TEMPLATE/feature_request.yml) templates are applied automatically. Before opening one:

- Check the [docs](./docs/README.md) and search existing issues first.
- For bugs: describe what you expected vs. what actually happened, steps to reproduce, your Node version and OS.
- For features: prefer proposing a new plugin or event module over a core change.
- Redact any secrets/session data first.
- Remember the scope: this is a base script, so issues asking to redesign core fundamentals are out of scope.
