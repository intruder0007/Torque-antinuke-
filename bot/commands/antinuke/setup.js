const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const SecureCommand = require('../../structures/SecureCommand');

class SetupCommand extends SecureCommand {
  constructor() {
    super();
    this.ownerOnly = true;
    this.data = new SlashCommandBuilder()
      .setName('setup')
      .setDescription('Configure TorqueAntiNuke for this server.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand(sub => sub
        .setName('logs')
        .setDescription('Set the channel where anti-nuke alerts are sent')
        .addChannelOption(o => o.setName('channel').setDescription('Log channel').setRequired(true))
      )
      .addSubcommand(sub => sub
        .setName('punishment')
        .setDescription('Set the default punishment for nukers')
        .addStringOption(o => o
          .setName('mode')
          .setDescription('Punishment mode')
          .setRequired(true)
          .addChoices(
            { name: 'Ban (permanent)', value: 'ban' },
            { name: 'Kick', value: 'kick' },
            { name: 'Strip all roles', value: 'strip' },
            { name: 'Quarantine (28-day timeout)', value: 'quarantine' },
          )
        )
      )
      .addSubcommand(sub => sub
        .setName('window')
        .setDescription('Set the rolling rate-limit window in seconds (default: 10)')
        .addIntegerOption(o => o
          .setName('seconds')
          .setDescription('Window size in seconds (5–60)')
          .setRequired(true)
          .setMinValue(5)
          .setMaxValue(60)
        )
      )
      .addSubcommand(sub => sub
        .setName('view')
        .setDescription('View current configuration for this server')
      );
  }

  async run(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'logs') {
      const channel = interaction.options.getChannel('channel');
      if (!channel.isTextBased()) {
        return interaction.reply({ content: '❌ Log channel must be a text channel.', ephemeral: true });
      }
      client.antinuke.setSetting(guildId, 'logChannel', channel.id);
      return interaction.reply({ content: `✅ Log channel set to <#${channel.id}>.`, ephemeral: true });
    }

    if (sub === 'punishment') {
      const mode = interaction.options.getString('mode');
      client.antinuke.setSetting(guildId, 'punishment', mode);
      return interaction.reply({ content: `✅ Default punishment set to **${mode}**.`, ephemeral: true });
    }

    if (sub === 'window') {
      const seconds = interaction.options.getInteger('seconds');
      client.antinuke.setSetting(guildId, 'window', seconds * 1000);
      return interaction.reply({ content: `✅ Rolling window set to **${seconds} seconds**.`, ephemeral: true });
    }

    if (sub === 'view') {
      const logChannel = client.antinuke.getSetting(guildId, 'logChannel');
      const punishment = client.antinuke.getSetting(guildId, 'punishment', 'ban');
      const window = client.antinuke.getSetting(guildId, 'window', 10000);
      const limits = client.antinuke.getSetting(guildId, 'limits', {});

      return interaction.reply({
        content: [
          '**TorqueAntiNuke — Server Configuration**',
          `Log Channel: ${logChannel ? `<#${logChannel}>` : 'Not set'}`,
          `Punishment: \`${punishment}\``,
          `Rolling Window: \`${window / 1000}s\``,
          `Custom Limits: ${Object.keys(limits).length > 0 ? '```json\n' + JSON.stringify(limits, null, 2) + '\n```' : 'Using defaults'}`,
        ].join('\n'),
        ephemeral: true,
      });
    }
  }
}

module.exports = new SetupCommand();
