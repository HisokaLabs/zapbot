# Examples 🧩

Three complete plugins, each a single `.js` file dropped into a category folder under `src/plugins/`: no `plugin.json`, no other file to touch. The autoloader (`core/PluginManager.js`) picks each one up on the next boot.

## Auto-reply plugin

Reacts to keywords in any message: not a command, so it's an **event plugin** (`type: 'event'`) listening on `"messageCreate"` instead of declaring `commands`.

```js
// src/plugins/main/autoreply.js

const RULES = [
   { match: /\b(halo|hai|hi)\b/i, reply: 'Hai juga! 👋' },
   { match: /\bharga\b/i, reply: 'Untuk info harga, ketik .menu' },
];

/** @type {import('#types').BotPlugin} */
export default {
   name: 'autoreply',
   type: 'event',
   description: 'Keyword-triggered auto replies',

   init(ctx) {
      ctx.events.on('messageCreate', async messageContext => {
         if (messageContext.fromMe || !messageContext.text) return;

         const rule = RULES.find(r => r.match.test(messageContext.text));
         if (!rule) return;

         await messageContext.reply(rule.reply);
      });
   },
};
```

## Downloader plugin

A **command plugin** that fetches a URL and sends it back as a document. Shows `command.args` parsing and a media content object.

```js
// src/plugins/tools/downloader.js

/** @type {import('#types').BotPlugin} */
export default {
   name: 'downloader',
   type: 'command',
   commands: ['dl', 'download'],
   description: 'Download a file from a direct URL and send it back',

   init(ctx) {
      ctx.logger.debug('downloader plugin initialized');
   },

   /** @param {import('#types').CommandContext} command */
   async execute(command) {
      const [url] = command.args;
      if (!url || !/^https?:\/\//.test(url)) {
         await command.reply('Usage: .dl <direct file URL>');
         return;
      }

      await command.reply({
         type: 'document',
         media: url,
         fileName: url.split('/').pop() || 'file',
         caption: 'Here you go!',
      });
   },
};
```

`media` accepts a file path, a `Readable`, or (per zapo's media guide) bytes: for a remote URL, fetch it into a temp file or stream first in a real deployment; this example keeps it short. See zapo's [Media guide](https://zapo.to/en/guides/media) for streaming a `fetch()` response body directly.

## AI plugin

A **command plugin** that calls an external LLM API and replies with the completion. Shows async work inside `execute`, reading config, and graceful failure.

```js
// src/plugins/ai/ask.js

/** @type {import('#types').BotPlugin} */
export default {
   name: 'ai',
   type: 'command',
   commands: ['ai', 'ask'],
   description: 'Ask an AI a question',

   init(ctx) {
      if (!process.env.AI_API_KEY) {
         ctx.logger.warn('ai plugin loaded but AI_API_KEY is not set: .ai will fail until it is.');
      }
   },

   /** @param {import('#types').CommandContext} command */
   async execute(command) {
      const question = command.args.join(' ');
      if (!question) {
         await command.reply('Usage: .ai <question>');
         return;
      }

      try {
         const response = await fetch('https://api.example.com/v1/complete', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
               Authorization: `Bearer ${process.env.AI_API_KEY}`,
            },
            body: JSON.stringify({ prompt: question }),
         });

         if (!response.ok) throw new Error(`API returned ${response.status}`);

         const { text } = await response.json();
         await command.reply(text);
      } catch (error) {
         command.ctx.logger.error('ai command failed', {
            error: error instanceof Error ? error.message : String(error),
         });
         await command.reply('Sorry, something went wrong asking the AI.');
      }
   },
};
```

Swap `https://api.example.com/v1/complete` for your real provider's endpoint and request/response shape. Note the `ai/ask.js` path: the category folder name (`ai`) doesn't need to match the plugin's `name` field (`ai`); they're independent, pick whatever grouping makes sense for your bot.
