/**
 * @type {import('#types').BotPlugin}
 */
export default {
   name: 'ping',
   type: 'command',
   commands: ['ping', 'latency'],
   description: 'Check bot latency',

   /** @param {import('#types').BotContext} ctx */
   init(ctx) {
      ctx.logger.debug('ping plugin initialized');
   },

   /** @param {import('#types').CommandContext} command */
   async execute(command) {
      const sentAtMs = (command.raw.timestampSeconds ?? Date.now() / 1000) * 1000;
      const latencyMs = Math.max(0, Date.now() - sentAtMs);

      await command.reply(`Pong!\nLatency: ${Math.round(latencyMs)}ms`);
   },
};
