const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const SecureCommand = require('../../structures/SecureCommand');

/**
 * /bypass — Role-based whitelist management.
 *
 * This is the command that covers the "Bypass Role" vulnerability.
 * Most anti-nukes only whitelist users. If an attacker gets a whitelisted role,
 * they bypass everything. This command lets the owner explicitly manage which
 * roles get which clearance level, with full visibility.
 */
class BypassCommand extends SecureCommand {
  constructor() {
    super();
    this.ownerOnly = true;
    this.data = new SlashCommandBuilder()
      .setName('bypass')
      .setDescription('Manage role-based bypass clearance levels.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand(sub => sub
        .setName('add')
        .setDescription('Grant a role a bypass clearance level')
        .addRoleOption(o => o.setName('role').setDescription('Role to grant bypass').setRequired(true))
        .addIntegerOption(o => o
          .setName('level')
          .setDescription('Clearance level')
          .setRequired(true)
          .addChoices(
            { name: '1 — Moderator (relaxed member action limits)', value: 1 },
            { name: '2 — Admin (relaxed structural limits, Vajra tracked)', value: 2 },
            { name: '3 — Immune (bypasses L1/L3/L4)', value: 3 },
          )
        )
      )
      .addSubcommand(sub => sub
        .setName('remove')
        .setDescription('Remove bypass clearance from a role')
        .addRoleOption(o => o.setName('role').setDescription('Role to remove bypass from').setRequired(true))
      )
      .addSubcommand(sub => sub
        .setName('list')
        .setDescription('List all roles with bypass clearance')
      )
      .addSubcommand(sub => sub
        .setName('check')
        .setDescription('Check the effective bypass level of a user (including their roles)')
        .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(true))
      );
  }

  async run(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'add') {
      const role = interaction.options.getRole('role');
      const level = interaction.options.getInteger('level');

      // Prevent whitelisting @everyone — that would bypass protection for the entire server
      if (role.id === guildId) {
        return interaction.reply({ content: '❌ You cannot grant bypass to `@everyone`.', ephemeral: true });
      }

      client.antinuke.setRoleWhitelist(guildId, role.id, level);
      return interaction.reply({
        content: `✅ <@&${role.id}> granted **Level ${level}** bypass clearance.`,
        ephemeral: true,
      });
    }

    if (sub === 'remove') {
      const role = interaction.options.getRole('role');
      client.antinuke.setRoleWhitelist(guildId, role.id, 0);
      return interaction.reply({
        content: `✅ Bypass clearance removed from <@&${role.id}>.`,
        ephemeral: true,
      });
    }

    if (sub === 'list') {
      const { roles } = client.antinuke.whitelist.listAll(guildId);
      if (roles.length === 0) {
        return interaction.reply({ content: 'No roles have bypass clearance configured.', ephemeral: true });
      }
      const lines = roles.map(r => `<@&${r.id}> — Level ${r.level}`).join('\n');
      return interaction.reply({ content: `**Bypass Roles:**\n${lines}`, ephemeral: true });
    }

    if (sub === 'check') {
      const user = interaction.options.getUser('user');
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        return interaction.reply({ content: '❌ Could not fetch that member.', ephemeral: true });
      }

      const level = client.antinuke.whitelist.getLevel(guildId, user.id, member.roles.cache);
      const labels = ['None (full protection)', 'Moderator', 'Admin (Vajra tracked)', 'Immune'];
      return interaction.reply({
        content: `**${user.tag}** effective bypass level: **${level} — ${labels[level] || 'Unknown'}**`,
        ephemeral: true,
      });
    }
  }
}

module.exports = new BypassCommand();
