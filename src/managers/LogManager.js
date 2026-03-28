const { EmbedBuilder } = require('discord.js');

const LAYER_META = {
  krauncha: { name: 'Krauncha Vyuha [L1]', color: 0xff4444, emoji: '🦅' },
  garuda:   { name: 'Garuda Vyuha [L2]',   color: 0xff8800, emoji: '🦅' },
  makara:   { name: 'Makara Vyuha [L3]',   color: 0xffcc00, emoji: '🐊' },
  padma:    { name: 'Padma Vyuha [L4]',    color: 0x00ccff, emoji: '🪷' },
  vajra:    { name: 'Vajra Vyuha [L5]',    color: 0xaa00ff, emoji: '⚡' },
  chakra:   { name: 'ChakraView [L6]',     color: 0xff0000, emoji: '🔴' },
};

class LogManager {
  constructor(db) {
    this.db = db;
  }

  async send(guild, layer, executorId, actionType, count, limit, extra = {}) {
    const channelId = this.db.getSetting(guild.id, 'logChannel');
    if (!channelId) return;

    const ch = guild.channels.cache.get(channelId);
    if (!ch?.isTextBased()) return;

    const meta = LAYER_META[layer] || { name: layer, color: 0x888888, emoji: '🛡️' };

    const embed = new EmbedBuilder()
      .setColor(meta.color)
      .setTitle(`${meta.emoji} ${meta.name} — Threat Intercepted`)
      .addFields(
        { name: 'Executor', value: `<@${executorId}> (\`${executorId}\`)`, inline: true },
        { name: 'Action', value: `\`${actionType}\``, inline: true },
        { name: 'Count / Limit', value: `${count} / ${limit}`, inline: true },
      )
      .setTimestamp();

    if (extra.role) embed.addFields({ name: 'Role', value: extra.role, inline: true });
    if (extra.everyone) embed.addFields({ name: '⚠️ Critical', value: '@everyone was the target', inline: true });
    if (extra.bot) embed.addFields({ name: 'Rogue Bot', value: `${extra.bot} (\`${extra.botId}\`)`, inline: true });
    if (extra.issues) embed.addFields({ name: 'Issues', value: extra.issues.join(', '), inline: false });

    await ch.send({ embeds: [embed] }).catch(() => {});
  }
}

module.exports = LogManager;
