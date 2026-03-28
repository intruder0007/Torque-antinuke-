require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const TorqueAntiNuke = require('../index.js');
const SlashHandler = require('./handlers/SlashHandler');

// --- Env validation — fail fast with clear errors ---
const REQUIRED_ENV = ['DISCORD_TOKEN', 'CLIENT_ID'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`[TorqueBot] Missing required environment variables: ${missing.join(', ')}`);
  console.error('[TorqueBot] Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildEmojisAndStickers,
  ],
});

client.commands = new Collection();

// Boot anti-nuke engine
client.antinuke = new TorqueAntiNuke({ client });

// Load slash commands
SlashHandler(client);

client.once('ready', () => {
  console.log(`[TorqueBot] Online as ${client.user.tag}`);
  console.log(`[TorqueBot] Loaded ${client.commands.size} commands`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild) return; // ignore DMs

  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  try {
    await cmd.execute(interaction, client);
  } catch (err) {
    console.error(`[TorqueBot] Command error (${interaction.commandName}):`, err);
    const msg = 'An error occurred. Incident logged.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: msg }).catch(() => {});
    } else {
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
    }
  }
});

// Unhandled rejection safety net — never crash the bot
process.on('unhandledRejection', err => {
  console.error('[TorqueBot] Unhandled rejection:', err?.message || err);
});

client.login(process.env.DISCORD_TOKEN);
