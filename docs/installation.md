# Installation ⚙️

## Requirements

- **Node.js >= 20.9.0** (required by `zapo-js`). Node 20 or 22 LTS is recommended; see the [Windows note](#windows-native-modules) below if you're on a very new Node release.
- **ffmpeg** on `PATH`: required by the internal sticker converter (`src/utils/sticker/webp.js`) to convert video/GIF input into stickers. Not needed if you only send/convert static images.
- A terminal that can render QR codes (any modern terminal works), or a phone ready to enter an 8-character pairing code instead.
- **Docker or Podman (optional)** — only needed if you want the developer `exec` plugin to run shell commands inside an isolated, disposable container. Without it, `exec` still works but falls back to running commands directly on the host (it warns loudly about the lack of isolation). See [Optional: isolated shell sandbox](#optional-isolated-shell-sandbox-exec-plugin) below.

## Install dependencies

```bash
npm install
```

This installs:

| Package                                    | Why                                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| `zapo-js`                                  | The WhatsApp Web protocol client the framework wraps.                      |
| `@zapo-js/store-sqlite` + `better-sqlite3` | Persists auth/session state to disk so you don't re-pair on every restart. |
| `sharp`                                    | Encodes static images to WebP for the internal sticker converter.          |
| `qrcode-terminal`                          | Renders the pairing QR code in your terminal.                              |

There is no build step, no bundler, and no type-checking pipeline: the framework runs directly as plain ESM JavaScript. Module aliases (`#core/*.js`, `#utils/*.js`, ...) come from `package.json`'s native `"imports"` field, and shared type hints live in a single JSDoc file, [`/types.js`](../types.js).

### Windows native modules

`better-sqlite3` and `sharp` are native addons. On Windows they need either:

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

## Optional: isolated shell sandbox (exec plugin)

The developer `exec` / `shell` command (`src/plugins/developer/exec.js`) runs **arbitrary shell commands**. To keep a malicious or runaway command from touching the host, it executes inside a throwaway container instead of the host shell. This is **optional** and adds nothing to the core — it's a single sample plugin.

- **With Docker or Podman installed** (and on `PATH`): the plugin auto-detects the runtime and runs the command in a container that has no host mounts, drops all Linux capabilities, runs as an unprivileged user, is network-isolated and resource-capped, and is removed (`--rm`) when finished. The default image is `debian:bookworm-slim` (must contain `bash` + `timeout`).
- **Without a container runtime**: the plugin falls back to running the command directly on the host (timeout + output cap only, **no isolation**) and logs a warning. Set `EXEC_SANDBOX_MODE=host` to opt into this explicitly, or `EXEC_SANDBOX_MODE=docker` / `podman` to _require_ that runtime.

Install a runtime only if you intend to use the `exec` plugin:

```bash
# Docker (any platform)
# https://docs.docker.com/get-docker/

# or Podman (rootless, drop-in alternative — set EXEC_SANDBOX_MODE=podman)
# https://podman.io/getting-started/installation

# Pull the default image once so the first exec doesn't wait on a download:
docker pull debian:bookworm-slim   # or: podman pull debian:bookworm-slim
```

All sandbox knobs (`mode`, `image`, `timeout`, resource limits, network, read-only, user) live under the `exec` key in `config/config.js`; see [configuration.md](./configuration.md#exec-sandbox-configuration) for the full reference.

## Run the bot

```bash
npm start   # node src/index.js
npm run dev # node --watch src/index.js (restarts on file changes)
```

Send `.ping`, `.menu`, or `.sticker` (replying to an image) to your bot's number once connected to confirm everything works.
