/** @typedef {import('#types').MessageKind} MessageKind */
/** @typedef {import('#types').PendingCommandState} PendingCommandState */

export const PENDING_COMMAND_TIMEOUT = 60 * 1000;

export class PendingCommandManager {
   /**
    * @param {{ logger?: import('#core/Logger.js').Logger, timeoutMs?: number }} [options]
    */
   constructor({ logger, timeoutMs = PENDING_COMMAND_TIMEOUT } = {}) {
      /** @type {import('#core/Logger.js').Logger | undefined} */
      this.logger = logger?.child({ scope: 'PendingCommandManager' });
      /** @type {number} */
      this.timeoutMs = timeoutMs;
      /** @type {Map<string, PendingCommandState>} */
      this.store = new Map();
   }

   /**
    * @param {string} chatId
    * @param {string} userId
    * @returns {string}
    */
   #key(chatId, userId) {
      return `${chatId}\u0000${userId}`;
   }

   /**
    * @param {object} input
    * @param {string} input.chatId Conversation the pending command belongs to.
    * @param {string} input.userId User that must provide the follow-up input.
    * @param {string} input.command Command name to resume (e.g. "sticker").
    * @param {string} [input.prefix] Prefix the user originally typed.
    * @param {string[]} [input.args] Original command arguments.
    * @param {MessageKind[]} [input.expectedInput] Message kinds accepted as the follow-up input.
    * @param {Record<string, unknown>} [input.data] Extra context forwarded to the resumed command.
    * @param {number} [input.timeout] Per-entry override of the default timeout.
    * @returns {PendingCommandState}
    */
   set({ chatId, userId, command, prefix = '', args = [], expectedInput = [], data, timeout }) {
      const now = Date.now();

      /** @type {PendingCommandState} */
      const state = {
         command,
         prefix,
         args,
         expectedInput,
         data,
         createdAt: now,
         expiresAt: now + (timeout ?? this.timeoutMs),
      };

      this.store.set(this.#key(chatId, userId), state);
      this.logger?.debug(`pending command set: ${command} (${chatId} / ${userId})`);
      return state;
   }

   /**
    * @param {import('#types').CommandContext} command
    * @param {MessageKind | MessageKind[]} expectedInput Single kind or list of accepted kinds.
    * @param {{ data?: Record<string, unknown>, timeout?: number }} [options]
    * @returns {PendingCommandState}
    */
   wait(command, expectedInput, options = {}) {
      return this.set({
         chatId: command.chatJid,
         userId: command.senderJid,
         command: command.command,
         prefix: command.prefix,
         args: command.args,
         expectedInput: Array.isArray(expectedInput) ? expectedInput : [expectedInput],
         data: options.data,
         timeout: options.timeout,
      });
   }

   /**
    * @param {string} chatId
    * @param {string} userId
    * @returns {PendingCommandState | undefined}
    */
   get(chatId, userId) {
      const key = this.#key(chatId, userId);
      const state = this.store.get(key);
      if (!state) return undefined;
      if (state.expiresAt <= Date.now()) {
         this.store.delete(key);
         return undefined;
      }
      return state;
   }

   /**
    * @param {string} chatId
    * @param {string} userId
    * @returns {boolean}
    */
   has(chatId, userId) {
      return this.get(chatId, userId) !== undefined;
   }

   /**
    * @param {string} chatId
    * @param {string} userId
    * @returns {PendingCommandState | undefined}
    */
   consume(chatId, userId) {
      const key = this.#key(chatId, userId);
      const state = this.store.get(key);
      if (!state) return undefined;
      this.store.delete(key);
      if (state.expiresAt <= Date.now()) return undefined;
      return state;
   }

   /**
    * @param {string} chatId
    * @param {string} userId
    * @returns {boolean}
    */
   clear(chatId, userId) {
      return this.store.delete(this.#key(chatId, userId));
   }

   clearAll() {
      this.store.clear();
   }
}

export default PendingCommandManager;
