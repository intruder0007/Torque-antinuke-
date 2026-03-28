const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const SecureCommand = require('../../structures/SecureCommand');

class StatusCommand extends SecureCommand {
  constructor() {
    super();
    this.data = new SlashCommandBuilder()
      .setName('status')
      .setDescription('View the full TorqueAntiNuke status for this server.')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
  }

  async run(interaction, client) {
    const guildId = interaction.guild.id;
    const an = client.antinuke;

    const logChannel = an.getSetting(guildId, 'logChannel');
    const punishment = an.getSetting(guildId, 'punishment', 'ban');
    const window = an.getSetting(guildId, 'window', 10000);
    const chakraActive = an.chakra.isActive(guildId);
    const { users, roles } = an.whitelist.listAll(guildId);

    const embed = new EmbedBuilder()
      .setTitle('🛡️ TorqueAntiNuke — System Status')
      .setColor(chakraActive ? 0xff0000 : 0x00cc66)
      .addFields(
        { name: '🔴 ChakraView [L6]', value: chakraActive ? '**LOCKDOWN ACTIVE**' : 'Standby', inline: true },
        { name: '📋 Log Channel', value: logChannel ? `<#${logChannel}>` : 'Not configured', inline: true },
        { name: '⚔️ Punishment', value: `\`${punishment}\``, inline: true },
        { name: '⏱️ Rolling Window', value: `${window / 1000}s`, inline: true },
        { name: '👤 Whitelisted Users', value: `${users.length}`, inline: true },
        { name: '🎭 Whitelisted Roles', value: `${roles.length}`, inline: true },
        {
          name: '🏛️ Active Layers',
          value: [
            '`L1` Krauncha Vyuha — Rate Limiter ✅',
            '`L2` Garuda Vyuha — Audit Sentinel ✅',
            '`L3` Makara Vyuha — Perm Escalation Guard ✅',
            '`L4` Padma Vyuha — Integration Shield ✅',
            '`L5` Vajra Vyuha — Slow-Burn Tracker ✅',
            `\`L6\` ChakraView — Ultimate Fortress ${chakraActive ? '🔴 ACTIVE' : '✅ Standby'}`,
          ].join('\n'),
          inline: false,
        }
      )
      .setFooter({ text: `TorqueAntiNuke • Guild: ${guildId}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

module.exports = new StatusCommand();
