# Installation ⚙️

## Requirements

- **Node.js >= 20.9.0** (required by `zapo-js`). Node 20 or 22 LTS is recommended; see the [Windows note](#windows-native-modules) below if you're on a very new Node release.
- **ffmpeg** on `PATH`: required by `wa-sticker-formatter` to convert video/GIF input into stickers. Not needed if you only send/convert static images.
- A terminal that can render QR codes (any modern terminal works), or a phone ready to enter an 8-character pairing code instead.

## Install dependencies

```bash
npm install
```

This installs:

| Package                                    | Why                                                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `zapo-js`                                  | The WhatsApp Web protocol client the framework wraps.                                              |
| `@zapo-js/store-sqlite` + `better-sqlite3` | Persists auth/session state to disk so you don't re-pair on every restart.                         |
| `wa-sticker-formatter`                     | Builds WebP stickers from images/video for the sticker plugin and the automatic sticker converter. |
| `qrcode-terminal`                          | Renders the pairing QR code in your terminal.                                                      |

There is no build step, no bundler, and no type-checking pipeline: the framework runs directly as plain ESM JavaScript. Module aliases (`#core/*.js`, `#utils/*.js`, ...) come from `package.json`'s native `"imports"` field, and shared type hints live in a single JSDoc file, [`/types.js`](../types.js).

### Windows native modules

`better-sqlite3` and (transitively, via `wa-sticker-formatter`) `sharp` are native addons. On Windows they need either:

1. A **prebuilt binary** for your exact Node version, usually available automatically for current Node LTS releases, or
2. **Build tools** to compile from source: [Visual Studio Build Tools](https://github.com/nodejs/node-gyp#on-windows) ("Desktop development with C++" workload) + Python 3.

If `npm install` fails while building `better-sqlite3` or `sharp`, the fastest fix is switching to an LTS Node version (`nvm install 22 && nvm use 22`) that already has prebuilt binaries published for it, rather than installing the full C++ toolchain. This is an environment/toolchain issue, not a framework bug.

## Setup environment

The framework has **no required environment variables**: everything lives in [`config/config.js`](../config/config.js). Review it and adjust at least:

- `session.storePath`: where the SQLite auth state is written (default `./.auth/state.sqlite`).
- `session.pairing`: `'qr'` (default) or `'code'`.
- `autoSticker.enabled`: off by default; flip to `true` to auto-convert every incoming image/GIF/short video into a sticker.

See [configuration.md](./configuration.md) for the full reference.

## Login WhatsApp

Start the bot:

```bash
npm start
```

- **QR pairing** (default): a QR code prints in your terminal. Open **WhatsApp → Linked devices → Link a device** on your phone and scan it.
- **Pairing code**: set `session.pairing: 'code'` and `session.phoneNumber: '<countrycode><number>'` (digits only) in `config/config.js`, then start the bot: an 8-character code prints in the terminal (`XXXX-XXXX`). Open **WhatsApp → Linked devices → Link with phone number instead** and enter it.

Once paired, credentials are persisted to `session.storePath`. Subsequent `npm start` runs reconnect automatically: no QR/code needed again unless you unlink the device from your phone.

## Run the bot

```bash
npm start   # node src/index.js
npm run dev # node --watch src/index.js (restarts on file changes)
```

Send `.ping`, `.menu`, or `.sticker` (replying to an image) to your bot's number once connected to confirm everything works.
