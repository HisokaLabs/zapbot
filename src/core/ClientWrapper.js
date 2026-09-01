import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { createMediaProcessor } from '@zapo-js/media-utils';
import { createSqliteStore } from '@zapo-js/store-sqlite';
import { wamPlugin } from '@zapo-js/wam';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { WaClient, createStore } from 'zapo-js';
import { WA_BROWSERS, WA_DISCONNECT_REASONS } from 'zapo-js/protocol';

/** @typedef {import('zapo-js').WaIncomingMessageEvent} WaIncomingMessageEvent */
/** @typedef {import('zapo-js').WaSendMessageContent} WaSendMessageContent */
/** @typedef {import('zapo-js').WaSendMessageOptions} WaSendMessageOptions */

export class ClientWrapper {
   /**
    * @param {{ config: import('#core/ConfigManager.js').ConfigManager, logger: import('#core/Logger.js').Logger, events: import('#core/EventManager.js').EventManager }} options
    */
   constructor({ config, logger, events }) {
      this.config = config;
      this.logger = logger.child({ scope: 'ClientWrapper' });
      this.events = events;
      this.reconnectAttempt = 0;
      this.intentionalDisconnect = false;

      this.client = this.createClient();
      this.wireEvents();
   }

   createClient() {
      const storePath = this.config.get('session.storePath', './.auth/state.sqlite');
      const sessionId = this.config.get('session.id', 'default');

      const store = createStore({
         backends: {
            sqlite: createSqliteStore({ path: storePath, driver: 'auto' }),
         },
         providers: {
            auth: 'sqlite',
            signal: 'sqlite',
            preKey: 'sqlite',
            session: 'sqlite',
            identity: 'sqlite',
            senderKey: 'sqlite',
            appState: 'sqlite',
            privacyToken: 'sqlite',
            messages: 'sqlite',
            threads: 'sqlite',
            contacts: 'sqlite',
         },
      });

      const logger = pino({
         level: this.config.get('logger.level', 'info'),
         transport: this.config.get('logger.pretty', true)
            ? {
                 target: 'pino-pretty',
                 options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                 },
              }
            : undefined,
         name: this.config.get('logger.name', 'zapo-client'),
      });

      return new WaClient(
         {
            store,
            sessionId,
            deviceBrowser: this.config.get('session.deviceBrowser', WA_BROWSERS.CHROME),
            deviceOsDisplayName: this.config.get('session.deviceOsDisplayName', 'Windows'),
            markOnlineOnConnect: this.config.get('session.markOnlineOnConnect', false),
            history: {
               enabled: true,
               requireFullSync: true,
            },
            media: {
               processor: createMediaProcessor(),
               generateThumbnail: true,
               generateWaveform: true,
               generateStickerThumbnail: true,
               normalizeVoiceNote: true,
            },
            plugins: [
               wamPlugin({
                  syntheticUi: false,
               }),
            ],
         },
         logger,
      );
   }

   async wireEvents() {
      const client = this.client;

      client.on('connection', event => {
         this.events.emit('connection', event);

         if (event.status === 'open') {
            this.reconnectAttempt = 0;
            this.events.emit('ready', event);
            return;
         }

         if (event.isLogout) {
            switch (event.reason) {
               case WA_DISCONNECT_REASONS.FAILURE_LOCKED:
                  this.logger.error(
                     'Session logged out — account is locked. Re-pairing if account is available.',
                  );
                  break;

               case WA_DISCONNECT_REASONS.FAILURE_BANNED:
                  this.logger.error(
                     'Session logged out — account is permanently banned. Re-pairing is not possible.',
                  );
                  break;

               case WA_DISCONNECT_REASONS.FAILURE_CLIENT_TOO_OLD:
                  this.logger.error(
                     'Session logged out — client is too old. Update the client and re-pair.',
                  );
                  break;

               case WA_DISCONNECT_REASONS.FAILURE_SERVICE_UNAVAILABLE:
                  this.logger.error(
                     'Session logged out — service is unavailable. Re-pairing may be possible later.',
                  );
                  break;

               case WA_DISCONNECT_REASONS.STREAM_ERROR_DEVICE_REMOVED:
                  this.logger.error(
                     'Session logged out — device was removed from the account by WhatsApp.',
                  );
                  break;

               default:
                  this.logger.error('Session logged out — re-pairing required on next start.');
                  break;
            }

            if (
               WA_DISCONNECT_REASONS.CLIENT_DISCONNECTED === event.reason &&
               this.config.get('session.autoReconnect', true)
            ) {
               this.logger.warn('Client disconnected — attempting to reconnect...');
               this.scheduleReconnect();
            }

            return;
         }

         if (!this.intentionalDisconnect && this.config.get('session.autoReconnect', true)) {
            this.scheduleReconnect();
         }
      });

      client.on('auth_qr', async ({ qr, ttlMs }) => {
         if (this.config.get('session.pairing') === 'qr') {
            this.logger.info(`Scan the QR code below within ${Math.round(ttlMs / 1000)}s`);
            qrcode.generate(qr, { small: true });
         }

         if (this.config.get('session.pairing') === 'code') {
            const phoneNumber = this.config.get('session.phoneNumber', '').replace(/\D+/g, '');
            await this.requestPairingCode(phoneNumber);
         }
      });

      client.on('auth_pairing_code', async ({ code }) => {
         if (this.config.get('session.pairing') !== 'code') return;

         this.logger.info(`Pairing code: ${code.match(/.{1,4}/g)?.join('-') ?? code}`);
      });

      client.on('auth_pairing_required', async ({ forceManual }) => {
         if (this.config.get('session.pairing') !== 'code') return;

         // `forceManual: true` means the QR refresh budget was exhausted and the user must request a fresh one (e.g. via the link-code flow).`
         if (!forceManual) return;

         const phoneNumber = this.config.get('session.phoneNumber', '').replace(/\D+/g, '');
         await this.requestPairingCode(phoneNumber);
      });

      client.on('auth_paired', ({ credentials }) => {
         this.logger.success(
            `Paired as ${credentials.meJid} (${credentials.pushName ?? 'no push name'})`,
         );
      });

      client.on('message', event => {
         this.events.emit('raw_message', event);
      });

      client.on('debug_client_error', ({ error }) => {
         this.events.emit('error', error);
      });
   }

   async requestPairingCode(phoneNumber) {
      if (!phoneNumber) {
         throw new Error('Phone number is required for pairing code request');
      }

      const code = await this.client.auth.requestPairingCode(phoneNumber, true);
      return code;
   }

   scheduleReconnect() {
      const maxAttempts = this.config.get('session.maxReconnectAttempts', 10);
      if (this.reconnectAttempt >= maxAttempts) {
         this.logger.error(`Giving up reconnecting after ${this.reconnectAttempt} attempts.`);
         return;
      }

      const delayMs = Math.min(30_000, 1_000 * 2 ** this.reconnectAttempt);

      this.reconnectAttempt += 1;
      this.logger.warn(
         `Connection dropped — reconnecting in ${delayMs}ms (attempt ${this.reconnectAttempt}/${maxAttempts})`,
      );

      setTimeout(() => {
         this.connect().catch(error => {
            this.logger.error('Reconnect attempt failed', {
               error: error instanceof Error ? error.message : String(error),
            });
            this.scheduleReconnect();
         });
      }, delayMs);
   }

   async connect() {
      const storePath = this.config.get('session.storePath', './.auth/state.sqlite');
      await mkdir(path.dirname(storePath), { recursive: true });
      this.intentionalDisconnect = false;
      await this.client.connect();
   }

   async disconnect() {
      this.intentionalDisconnect = true;
      await this.client.disconnect();
   }

   /**
    * @param {string} jid
    * @param {WaSendMessageContent} content
    * @param {WaSendMessageOptions} [options]
    */
   sendMessage(jid, content, options) {
      return this.client.message.send(jid, content, options);
   }

   /**
    * @param {WaIncomingMessageEvent} event
    * @param {WaSendMessageContent} content
    * @param {WaSendMessageOptions} [options]
    */
   reply(event, content, options) {
      const jid = event.key.remoteJidAlt ?? event.key.remoteJid;
      return this.client.message.send(jid, content, { ...options, quote: event });
   }

   /**
    * @param {WaIncomingMessageEvent} event
    * @param {string} filePath
    */
   downloadToFile(event, filePath) {
      return this.client.message.downloadToFile(event, filePath);
   }

   /** @param {WaIncomingMessageEvent} event */
   downloadBytes(event) {
      return this.client.message.downloadBytes(event);
   }

   /** @param {(event: import('zapo-js').WaConnectionEvent) => void} listener */
   onConnectionEvent(listener) {
      this.client.on('connection', listener);
   }
}

export default ClientWrapper;
