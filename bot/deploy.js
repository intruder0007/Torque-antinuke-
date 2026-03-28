require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
  console.error('[Deploy] DISCORD_TOKEN and CLIENT_ID must be set in .env');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

function loadCommands(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadCommands(full);
    } else if (entry.name.endsWith('.js')) {
      try {
        const cmd = require(full);
        if (cmd?.data) {
          commands.push(cmd.data.toJSON());
        } else {
          console.warn(`[Deploy] Skipping ${full} — no data property`);
        }
      } catch (err) {
        console.error(`[Deploy] Failed to load ${full}:`, err.message);
      }
    }
  }
}

loadCommands(commandsPath);

const rest = new REST().setToken(process.env.DISCORD_TOKEN);
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

(async () => {
  try {
    console.log(`[Deploy] Deploying ${commands.length} commands...`);

    if (guildId) {
      // Guild deploy — instant, use during development
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log(`[Deploy] ✅ Deployed to guild ${guildId} (instant)`);
    } else {
      // Global deploy — takes up to 1 hour to propagate
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('[Deploy] ✅ Deployed globally (up to 1h to propagate)');
    }
  } catch (err) {
    console.error('[Deploy] Failed:', err.message);
  }
})();
