const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const SecureCommand = require('../../structures/SecureCommand');

const LEVEL_LABELS = {
  0: '0 — Removed (full protection applies)',
  1: '1 — Moderator (relaxed limits on ban/kick)',
  2: '2 — Admin (relaxed limits on structural actions, tracked by Vajra)',
  3: '3 — Immune (bypasses Krauncha/Makara/Padma — Vajra still watches)',
};

class WhitelistCommand extends SecureCommand {
  constructor() {
    super();
    this.ownerOnly = true;
    this.data = new SlashCommandBuilder()
      .setName('whitelist')
      .setDescription('Manage the Vyuha multi-tier whitelist for users and roles.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand(sub => sub
        .setName('user')
        .setDescription('Set whitelist level for a user')
        .addUserOption(o => o.setName('target').setDescription('User to whitelist').setRequired(true))
        .addIntegerOption(o => o
          .setName('level')
          .setDescription('Clearance level (0 = remove)')
          .setRequired(true)
          .addChoices(
            { name: '0 — Remove', value: 0 },
            { name: '1 — Moderator', value: 1 },
            { name: '2 — Admin (Vajra tracked)', value: 2 },
            { name: '3 — Immune', value: 3 },
          )
        )
      )
      .addSubcommand(sub => sub
        .setName('role')
        .setDescription('Set whitelist level for a role')
        .addRoleOption(o => o.setName('target').setDescription('Role to whitelist').setRequired(true))
        .addIntegerOption(o => o
          .setName('level')
          .setDescription('Clearance level (0 = remove)')
          .setRequired(true)
          .addChoices(
            { name: '0 — Remove', value: 0 },
            { name: '1 — Moderator', value: 1 },
            { name: '2 — Admin (Vajra tracked)', value: 2 },
            { name: '3 — Immune', value: 3 },
          )
        )
      )
      .addSubcommand(sub => sub
        .setName('list')
        .setDescription('View all whitelisted users and roles')
      );
  }

  async run(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'user') {
      const user = interaction.options.getUser('target');
      const level = interaction.options.getInteger('level');
      client.antinuke.setUserWhitelist(guildId, user.id, level);
      return interaction.reply({
        content: level === 0
          ? `✅ Removed <@${user.id}> from the whitelist.`
          : `🛡️ Set <@${user.id}> to **${LEVEL_LABELS[level]}**.`,
        ephemeral: true,
      });
    }

    if (sub === 'role') {
      const role = interaction.options.getRole('target');
      const level = interaction.options.getInteger('level');
      client.antinuke.setRoleWhitelist(guildId, role.id, level);
      return interaction.reply({
        content: level === 0
          ? `✅ Removed <@&${role.id}> from the whitelist.`
          : `🛡️ Set <@&${role.id}> to **${LEVEL_LABELS[level]}**.`,
        ephemeral: true,
      });
    }

    if (sub === 'list') {
      const { users, roles } = client.antinuke.whitelist.listAll(guildId);
      const userLines = users.length
        ? users.map(u => `<@${u.id}> — Level ${u.level}`).join('\n')
        : 'None';
      const roleLines = roles.length
        ? roles.map(r => `<@&${r.id}> — Level ${r.level}`).join('\n')
        : 'None';

      return interaction.reply({
        content: `**Whitelisted Users:**\n${userLines}\n\n**Whitelisted Roles:**\n${roleLines}`,
        ephemeral: true,
      });
    }
  }
}

module.exports = new WhitelistCommand();
