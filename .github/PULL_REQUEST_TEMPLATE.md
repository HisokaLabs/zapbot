<!--
   Thanks for contributing! Please read CONTRIBUTING.md and AGENTS.md first,
   then fill out every section below. Delete this comment before submitting.
-->

## Summary

<!-- One or two sentences: what does this PR change and why? -->

## Type of change

<!-- Check all that apply -->

- [ ] **feat** — new feature (new plugin / event module / capability)
- [ ] **fix** — bug fix
- [ ] **docs** — documentation only
- [ ] **refactor** — code change that neither fixes a bug nor adds a feature

## Scope — read before changing code

> ⚠️ **This repository is a base script** built on top of
> [`zapo-js`](https://github.com/vinikjkkj/zapo). Keep changes minimal and
> focused — **do not overhaul fundamentals**.
>
> - ✅ **Allowed:** fixing a **logical bug**, adding a **plugin**, adding an
>   **event module**, adding a **utility function**, docs/config improvements.
> - ❌ **Avoid:** rewriting the core architecture, changing built-in event
>   payload shapes (`MessageContext`, `CommandContext`, ...), renaming or
>   restructuring public APIs, replacing the event-bus design, or large
>   refactors that touch many files at once.
> - If a fundamental change is truly unavoidable, explain in detail below and
>   link to a discussion/issue first.

Did this PR touch any fundamental layer? (check all that apply)

- [ ] `src/core/*` — if checked, explain exactly why it is required and what would break without it:
- [ ] A built-in event payload shape — if checked, this is a **breaking change**; justify it:
- [ ] No — this is a scoped fix/feature on top of the existing fundamentals

## Related issue(s)

<!-- Link any issue(s), e.g. `#123`. Write "None" if there is none. -->

## How it was tested

<!-- Describe manual testing against a running bot: which commands/messages, expected vs actual behavior. -->

- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] Manually verified against a running bot

## Checklist

- [ ] One feature/fix per PR; branch created for this change
- [ ] Conventional Commit message (`feat:` / `fix:` / `docs:` / `refactor:`), subject under ~72 chars
- [ ] Imports use `#`-aliases (`#core/*.js`, `#utils/*.js`, ...), no relative `../../` chains
- [ ] Plugins stay isolated: no plugin-to-plugin imports, no direct `src/core/*` access, nothing beyond `ctx`
- [ ] JSDoc added/updated for new exports; shared types referenced from `types.js` via `#types`
- [ ] No secrets, session data, or `.env` values committed
