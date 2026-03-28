const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const SecureCommand = require('../../structures/SecureCommand');

class ChakraViewCommand extends SecureCommand {
  constructor() {
    super();
    this.ownerOnly = true;
    this.data = new SlashCommandBuilder()
      .setName('chakraview')
      .setDescription('Engage or disengage the ChakraView total lockdown protocol [L6].')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand(sub => sub
        .setName('engage')
        .setDescription('🚨 Engage full server lockdown — strips all permissions and hides all channels')
      )
      .addSubcommand(sub => sub
        .setName('disengage')
        .setDescription('✅ Lift lockdown and restore all permissions from pre-attack snapshot')
      )
      .addSubcommand(sub => sub
        .setName('status')
        .setDescription('Check if ChakraView lockdown is currently active')
      );
  }

  async run(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'engage') {
      if (client.antinuke.chakra.isActive(interaction.guild.id)) {
        return interaction.reply({ content: '⚠️ ChakraView is already active.', ephemeral: true });
      }
      await interaction.reply('🚨 **Engaging ChakraView lockdown...** All permissions will be suspended immediately.');
      await client.antinuke.activateChakraView(interaction.guild, `Manual activation by ${interaction.user.tag}`);
      return;
    }

    if (sub === 'disengage') {
      if (!client.antinuke.chakra.isActive(interaction.guild.id)) {
        return interaction.reply({ content: '✅ ChakraView is not currently active.', ephemeral: true });
      }
      const hasSnapshot = client.antinuke.snapshot.hasSnapshot(interaction.guild.id);
      await interaction.reply(
        hasSnapshot
          ? '✅ **Lifting ChakraView lockdown...** Restoring all permissions from pre-attack snapshot.'
          : '⚠️ **Lifting ChakraView lockdown...** No snapshot found — permissions will NOT be auto-restored. Restore them manually.'
      );
      await client.antinuke.disableChakraView(interaction.guild);
      return;
    }

    if (sub === 'status') {
      const active = client.antinuke.chakra.isActive(interaction.guild.id);
      const hasSnapshot = client.antinuke.snapshot.hasSnapshot(interaction.guild.id);
      return interaction.reply({
        content: active
          ? `🔴 **ChakraView is ACTIVE.**\nSnapshot available for restore: ${hasSnapshot ? '✅ Yes' : '❌ No'}`
          : '🟢 **ChakraView is inactive.** Server is operating normally.',
        ephemeral: true,
      });
    }
  }
}

module.exports = new ChakraViewCommand();
