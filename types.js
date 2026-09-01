/**
 * Shared JSDoc type definitions for the WhatsApp Bot Framework.
 *
 * This project ships as plain ESM JavaScript with no build step and no
 * type-checking pipeline. This single root-level file exists purely so
 * editors can resolve `@typedef {import('#types').X}` references scattered
 * across core/plugins/events/utils for hover info and autocomplete — it is
 * never executed and never imported at runtime.
 *
 * @module types
 */

/**
 * @typedef {'trace' | 'debug' | 'info' | 'warn' | 'error'} LogLevel
 */

/**
 * @typedef {object} BotSessionConfig
 * @property {string} id Logical session id, forwarded to zapo's `WaClient`.
 * @property {string} storePath Filesystem path to the SQLite auth/session store.
 * @property {'qr' | 'code'} pairing Pairing method used on first connect.
 * @property {string} [phoneNumber] Required when `pairing` is `'code'`. Digits only, with country code.
 * @property {boolean} autoReconnect Reconnect automatically after a non-logout disconnect.
 * @property {number} maxReconnectAttempts Max reconnect attempts before giving up (exponential backoff).
 */

/**
 * @typedef {object} DeveloperConfig
 * @property {string[]} numbers Developer phone numbers (digits only, with country code) allowed to run `developer`-category commands.
 */

/**
 * @typedef {object} SelfBotConfig
 * @property {boolean} enabled Master switch. When false, everyone can use the bot.
 */

/**
 * @typedef {object} AutoStickerConfig
 * @property {boolean} enabled Master switch. When false, incoming media is never auto-converted.
 * @property {number} videoDurationLimit Videos longer than this (seconds) are ignored, not converted.
 * @property {string} packname Sticker pack name embedded in the WebP EXIF metadata.
 * @property {string} author Sticker author embedded in the WebP EXIF metadata.
 */

/**
 * @typedef {object} BotConfig
 * @property {string | string[]} prefix Single prefix, multiple prefixes, or a custom list — always normalized to an array.
 * @property {BotSessionConfig} session
 * @property {AutoStickerConfig} autoSticker
 * @property {DeveloperConfig} developer
 * @property {SelfBotConfig} selfBot
 * @property {{ directory: string }} plugins
 * @property {{ level: LogLevel }} logger
 */

/**
 * @typedef {object} StickerOptions
 * @property {string} [pack] Sticker pack name (`sticker-pack-name` EXIF metadata).
 * @property {string} [author] Sticker pack publisher (`sticker-pack-publisher` EXIF metadata).
 * @property {'default' | 'full' | 'crop'} [type] `default`/`full` pad the image with transparency into a 512x512 square; `crop` fills the square by cropping.
 * @property {number} [quality] WebP quality, 0-100 (static images only).
 * @property {boolean} [isVideo] Force the video/GIF (ffmpeg) path; auto-detected from the buffer when omitted.
 */

/**
 * @typedef {'text' | 'image' | 'video' | 'gif' | 'audio' | 'ptt' | 'document' | 'sticker' | 'poll' | 'location' | 'contact' | 'unknown'} MessageKind
 */

/**
 * A message this event/plugin's incoming message quotes (replies to).
 *
 * @typedef {object} QuotedMessage
 * @property {import('zapo-js').Proto.IMessage} message The quoted message's raw protobuf content.
 * @property {MessageKind} type
 */

/**
 * A transient "waiting for more input" record, stored by
 * `core/PendingCommandManager.js` and keyed by `chatId + userId`. Lives only
 * in process memory: it is lost when the bot restarts.
 *
 * @typedef {object} PendingCommandState
 * @property {string} command Command name to resume (e.g. "sticker").
 * @property {string} prefix Prefix the user originally typed.
 * @property {string[]} args Original command arguments.
 * @property {MessageKind[]} expectedInput Message kinds accepted as the follow-up input.
 * @property {Record<string, unknown>} [data] Arbitrary extra context forwarded to the resumed command.
 * @property {number} createdAt Unix epoch ms when the pending command was registered.
 * @property {number} expiresAt Unix epoch ms after which the pending command is void.
 */

/**
 * Normalized, convenient view of an incoming zapo message — built once by
 * `utils/parseMessage.js` per inbound event and threaded through the
 * middleware stack, event bus, and command dispatch. Extended into a
 * {@link CommandContext} when the text matches a registered command.
 *
 * @typedef {object} MessageContext
 * @property {import('zapo-js').WaIncomingMessageEvent} raw The original zapo event, for anything not covered below.
 * @property {BotContext} ctx Shared bot context (client, config, logger, utils, ...).
 * @property {import('zapo-js').WaMessageKey} key
 * @property {string} id Stanza (message) id.
 * @property {string} chatJid Conversation JID (group or 1:1).
 * @property {string} senderJid Sender JID (participant in groups, remoteJid in 1:1).
 * @property {boolean} isGroup True when the chat is a group.
 * @property {boolean} fromMe True when this event is an echo of our own outgoing message.
 * @property {string} [pushName] Sender's push name, when available.
 * @property {string} text Extracted plain text, trimmed.
 * @property {MessageKind} type Coarse message classification (see `utils/media.js#getMessageKind`).
 * @property {boolean} isMedia True when the message carries a downloadable media attachment.
 * @property {(kind: MessageKind) => boolean} isType Shorthand for `message.type === kind`.
 * @property {string} [mimetype] Resolved media mimetype, when known.
 * @property {number} [seconds] Video/audio duration in seconds, when known.
 * @property {QuotedMessage} [quoted] The message this one quotes (replies to), when any.
 * @property {string[]} mentions JIDs mentioned in the message body.
 * @property {(content: import('zapo-js').WaSendMessageContent, options?: import('zapo-js').WaSendMessageOptions) => Promise<import('zapo-js').WaMessagePublishResult>} send Send into the originating chat.
 * @property {(content: import('zapo-js').WaSendMessageContent, options?: import('zapo-js').WaSendMessageOptions) => Promise<import('zapo-js').WaMessagePublishResult>} reply Reply (quoting this message) into the originating chat.
 */

/**
 * Passed to `BotPlugin#execute` for a matched command. Extends
 * {@link MessageContext} with the parsed prefix/command/args.
 *
 * @typedef {MessageContext & { prefix: string, command: string, args: string[] }} CommandContext
 */

/**
 * Emitted on `media`/`image`/`video`/`gif`/`sticker` bus events whenever an
 * inbound message carries a media attachment.
 *
 * @typedef {object} MediaContext
 * @property {import('zapo-js').WaIncomingMessageEvent} raw
 * @property {BotContext} ctx
 * @property {'image' | 'video' | 'gif' | 'audio' | 'sticker' | 'document'} type
 * @property {string} [mimetype]
 * @property {number} [seconds]
 * @property {string} [caption]
 * @property {(filePath: string) => Promise<void>} downloadToFile Stream the media to a file.
 * @property {() => Promise<Uint8Array>} downloadBytes Buffer the media in memory (small media only).
 */

/**
 * The shape of a file under `src/events/`. Registered once at boot; its
 * `register(ctx)` hook is where it subscribes to `ctx.events`.
 *
 * @typedef {object} BotEventModule
 * @property {string} name Unique, descriptive event-module name (for logging/debugging).
 * @property {(ctx: BotContext) => void} register Subscribe to whatever events this module reacts to.
 */

/**
 * @typedef {(ctx: MessageContext, next: () => Promise<void>) => (void | Promise<void>)} Middleware
 */

/**
 * The contract every file under `src/plugins/<category>/<name>.js` must
 * satisfy as its default export. There is no separate metadata file — a
 * plugin's category is simply the subfolder it lives in
 * (`plugins/main/ping.js` → category `"main"`), and it can be disabled in
 * place by setting `enabled: false` on the export instead of deleting it.
 *
 * @typedef {object} BotPlugin
 * @property {string} name Unique plugin name.
 * @property {'command' | 'event'} type
 * @property {string[]} [commands] Command names this plugin answers to. Required when `type === 'command'`.
 * @property {Record<string, string>} [triggers] Optional map of trigger symbol -> command name (one of `commands`) that lets that command run *without* a prefix. e.g. `{ '>': 'eval' }` makes `> 1 + 1` invoke `eval`. Symbols take effect after the normal prefix path fails to match a command.
 * @property {string} [description]
 * @property {string} [version]
 * @property {string} [author]
 * @property {boolean} [enabled] Defaults to `true`. Set `false` to keep the file in place but skip loading it.
 * @property {(ctx: BotContext) => void | Promise<void>} init Called once at load time with the shared bot context.
 * @property {(command: CommandContext) => Promise<void>} [execute] Called for every matched command. Required when `type === 'command'`.
 */

/**
 * @typedef {object} LoadedPlugin
 * @property {BotPlugin} plugin
 * @property {string} category Derived from the plugin's subfolder under `plugins.directory` (e.g. `"main"`, `"media"`).
 * @property {string} filePath
 */

/**
 * The object every plugin's `init`, every event module's `register`, and
 * every middleware receives.
 *
 * @typedef {object} BotContext
 * @property {import('zapo-js').WaClient<{}> & { readonly wam: import('zapo-js').WaWamCoordinator }} client The underlying zapo `WaClient`, for anything the wrapper doesn't cover.
 * @property {import('#core/ClientWrapper.js').ClientWrapper} wa Thin convenience wrapper around the zapo client.
 * @property {import('#core/ConfigManager.js').ConfigManager} config
 * @property {import('#core/Logger.js').Logger} logger
 * @property {import('#core/PluginManager.js').PluginManager} plugins
 * @property {import('#core/CommandManager.js').CommandManager} commands
 * @property {import('#core/PendingCommandManager.js').PendingCommandManager} pending Transient in-memory pending-command store.
 * @property {import('#core/EventManager.js').EventManager} events
 * @property {import('#core/MiddlewareManager.js').MiddlewareManager} middleware
 * @property {{ helper: typeof import('#utils/helper.js'), media: typeof import('#utils/media.js'), sticker: typeof import('#utils/sticker.js'), parseMessage: import('#utils/parseMessage.js').parseMessage }} utils
 * @property {(jid: string, content: import('zapo-js').WaSendMessageContent, options?: import('zapo-js').WaSendMessageOptions) => Promise<import('zapo-js').WaMessagePublishResult>} sendMessage Send into an arbitrary chat, not tied to an incoming message.
 * @property {(plugin: BotPlugin) => void} registerCommand Register a command plugin programmatically.
 * @property {(eventModule: BotEventModule) => void} registerEvent Register an event module programmatically.
 * @property {(event: import('zapo-js').WaIncomingMessageEvent, filePath?: string) => Promise<Uint8Array | void>} downloadMedia Download media referenced by a raw incoming message event.
 */

export {};
