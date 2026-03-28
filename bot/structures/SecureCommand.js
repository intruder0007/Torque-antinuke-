const config = require('../config.json');

/**
 * SecureCommand — Abstract base class for all Torque bot commands.
 *
 * Every command that extends this gets:
 * 1. Guild-only enforcement (no DM execution)
 * 2. ChakraView lockdown gate (only owner/devs can run commands during lockdown)
 * 3. Error masking (stack traces never reach Discord users)
 * 4. Deferred reply safety (handles both deferred and non-deferred states)
 */
class SecureCommand {
  constructor() {
    if (new.target === SecureCommand) {
      throw new Error('SecureCommand is abstract — extend it, do not instantiate it directly');
    }
    this.data = null;
    this.ownerOnly = false; // set to true in child if command is owner-only
  }

  async execute(interaction, client) {
    // Guard: guild only
    if (!interaction.guild) {
      return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    }

    // Guard: ChakraView lockdown
    if (client.antinuke?.chakra?.isActive(interaction.guild.id)) {
      const isOwner = interaction.user.id === interaction.guild.ownerId;
      const isDev = config.DEVELOPER_IDS?.includes(interaction.user.id);
      if (!isOwner && !isDev) {
        return interaction.reply({
          content: '🔴 **ChakraView lockdown is active.** Commands are restricted to the server owner only.',
          ephemeral: true,
        });
      }
    }

    // Guard: owner-only commands
    if (this.ownerOnly && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: '❌ Only the server owner can use this command.', ephemeral: true });
    }

    try {
      await this.run(interaction, client);
    } catch (err) {
      console.error(`[SecureCommand:${this.data?.name}]`, err);
      const msg = 'An error occurred while executing this command. Incident logged.';
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: msg }).catch(() => {});
      } else {
        await interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
      }
    }
  }

  async run(interaction, client) {
    throw new Error(`run() not implemented in command: ${this.data?.name}`);
  }
}

module.exports = SecureCommand;
