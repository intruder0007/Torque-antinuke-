const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const SecureCommand = require('../../structures/SecureCommand');

const ACTIONS = [
  'channelDelete', 'channelCreate', 'roleDelete', 'roleCreate',
  'roleDangerousUpdate', 'memberBan', 'memberKick',
  'webhookCreate', 'botAdd', 'guildUpdate', 'emojiDelete',
];

const DEFAULTS = {
  channelDelete: 2, channelCreate: 3, roleDelete: 2, roleCreate: 3,
  roleDangerousUpdate: 1, memberBan: 2, memberKick: 3,
  webhookCreate: 2, botAdd: 1, guildUpdate: 1, emojiDelete: 4,
};

class LimitsCommand extends SecureCommand {
  constructor() {
    super();
    this.ownerOnly = true;
    this.data = new SlashCommandBuilder()
      .setName('limits')
      .setDescription('Configure per-action rate limit thresholds.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand(sub => sub
        .setName('set')
        .setDescription('Set the limit for a specific action')
        .addStringOption(o => o
          .setName('action')
          .setDescription('Action type')
          .setRequired(true)
          .addChoices(...ACTIONS.map(a => ({ name: a, value: a })))
        )
        .addIntegerOption(o => o
          .setName('count')
          .setDescription('Number of actions before punishment triggers')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(20)
        )
      )
      .addSubcommand(sub => sub
        .setName('view')
        .setDescription('View all current limits vs defaults')
      )
      .addSubcommand(sub => sub
        .setName('reset')
        .setDescription('Reset all limits back to defaults')
      );
  }

  async run(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'set') {
      const action = interaction.options.getString('action');
      const count = interaction.options.getInteger('count');
      const current = client.antinuke.getSetting(guildId, 'limits', {});
      current[action] = count;
      client.antinuke.setSetting(guildId, 'limits', current);
      return interaction.reply({
        content: `✅ Limit for \`${action}\` set to **${count}** (default: ${DEFAULTS[action] ?? 3}).`,
        ephemeral: true,
      });
    }

    if (sub === 'view') {
      const custom = client.antinuke.getSetting(guildId, 'limits', {});
      const lines = ACTIONS.map(a => {
        const val = custom[a] ?? DEFAULTS[a] ?? 3;
        const isCustom = custom[a] !== undefined;
        return `\`${a}\`: **${val}**${isCustom ? ' *(custom)*' : ''}`;
      });
      return interaction.reply({ content: '**Action Limits:**\n' + lines.join('\n'), ephemeral: true });
    }

    if (sub === 'reset') {
      client.antinuke.setSetting(guildId, 'limits', {});
      return interaction.reply({ content: '✅ All limits reset to defaults.', ephemeral: true });
    }
  }
}

module.exports = new LimitsCommand();
