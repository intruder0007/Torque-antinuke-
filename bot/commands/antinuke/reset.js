const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const SecureCommand = require('../../structures/SecureCommand');

class ResetCommand extends SecureCommand {
  constructor() {
    super();
    this.ownerOnly = true;
    this.data = new SlashCommandBuilder()
      .setName('reset')
      .setDescription('Reset rate-limit counters for a user (clears their Krauncha Vyuha history).')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption(o => o
        .setName('user')
        .setDescription('User to reset (leave blank to reset all counters)')
        .setRequired(false)
      );
  }

  async run(interaction, client) {
    const user = interaction.options.getUser('user');

    if (user) {
      client.antinuke.krauncha.resetUser(user.id);
      return interaction.reply({
        content: `✅ Rate-limit counters cleared for <@${user.id}>.`,
        ephemeral: true,
      });
    }

    // Reset all
    client.antinuke.krauncha._buckets.clear();
    return interaction.reply({
      content: '✅ All rate-limit counters cleared.',
      ephemeral: true,
    });
  }
}

module.exports = new ResetCommand();
