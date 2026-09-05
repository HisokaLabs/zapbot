/**
 * @type {import('#types').BotPlugin}
 */

import { isDeveloper } from '#utils/developer.js';

export default {
   name: 'self',
   type: 'command',
   commands: ['self'],
   description: 'Toggle self-bot mode (developer only)',

   /** @param {import('#types').BotContext} ctx */
   init(ctx) {
      ctx.selfBotEnabled = ctx.config.get('selfBot.enabled', false);

      ctx.logger.info(`Self-bot mode: ${ctx.selfBotEnabled ? 'ON' : 'OFF'}`);
   },

   /** @param {import('#types').CommandContext} command */
   async execute(command) {
      const { ctx } = command;

      if (!isDeveloper(ctx, command.senderJid)) {
         await command.reply('This command is restricted to bot developers only.');
         return;
      }

      const action = (command.args[0] ?? '').toLowerCase();

      if (!['on', 'off'].includes(action)) {
         const status = ctx.selfBotEnabled ? 'ON' : 'OFF';

         await command.reply(
            `Self-bot mode is currently *${status}*.\n\n` + `Usage:\n` + `.self on\n` + `.self off`,
         );
         return;
      }

      ctx.selfBotEnabled = action === 'on';

      await command.reply(`Self-bot mode: *${ctx.selfBotEnabled ? 'ON' : 'OFF'}*`);

      ctx.logger.info(
         `Self-bot mode changed to ${ctx.selfBotEnabled ? 'ON' : 'OFF'} by ${command.senderJid}`,
      );
   },
};
