/**
 * @type {import('#types').BotPlugin}
 */
export default {
   name: 'menu',
   type: 'command',
   commands: ['menu', 'help'],
   description: 'List available commands, grouped by plugin category',

   /** @param {import('#types').BotContext} ctx */
   init(ctx) {
      ctx.logger.debug('menu plugin initialized');
   },

   /** @param {import('#types').CommandContext} command */
   async execute(command) {
      const { ctx } = command;
      const prefix = ctx.config.getPrefixes()[0] ?? '.';

      /** @type {Map<string, string[]>} */
      const grouped = new Map();
      for (const { plugin, category } of ctx.plugins.list()) {
         if (plugin.type !== 'command' || !plugin.commands?.length) continue;
         const list = grouped.get(category) ?? [];
         list.push(...plugin.commands);
         grouped.set(category, list);
      }

      const lines = ['BOT MENU', ''];
      for (const [category, commands] of [...grouped.entries()].sort(([a], [b]) =>
         a.localeCompare(b),
      )) {
         lines.push(`*${category.toUpperCase()}*`);
         lines.push(...[...new Set(commands)].sort().map(name => `${prefix}${name}`));
         lines.push('\n');
      }
      lines.push(`Total Plugin: ${ctx.plugins.count()}`);

      await command.reply(lines.join('\n'));
   },
};
