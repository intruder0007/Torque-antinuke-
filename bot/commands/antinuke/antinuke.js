const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const SecureCommand = require('../../structures/SecureCommand');
const { version } = require('../../../package.json');

class AntinukeCommand extends SecureCommand {
  constructor() {
    super();
    this.data = new SlashCommandBuilder()
      .setName('antinuke')
      .setDescription('View the TorqueAntiNuke Vyuha Defense architecture and version info.');
  }

  async run(interaction, client) {
    const embed = new EmbedBuilder()
      .setTitle('⚔️ TorqueAntiNuke — Vyuha Defense System')
      .setColor(0x7700ff)
      .setDescription(`Version \`${version}\` — 6-Layer Mahabharata-inspired defense architecture`)
      .addFields(
        {
          name: '🦅 L1 — Krauncha Vyuha (Entry Gate)',
          value: 'Rolling token-bucket rate limiter. Catches fast nukes. Relaxed limits for trusted users — never full bypass.',
          inline: false,
        },
        {
          name: '🦅 L2 — Garuda Vyuha (Audit Sentinel)',
          value: 'Reconciles gateway events against audit logs. Detects ghost events (token nukes that bypass audit logs). Escalates to ChakraView on 3+ ghost events.',
          inline: false,
        },
        {
          name: '🐊 L3 — Makara Vyuha (Crocodile Grip)',
          value: 'Catches permission escalation attacks: @everyone admin grants, role permission updates, vanity URL steals, verification level drops. Auto-reverts before punishing.',
          inline: false,
        },
        {
          name: '🪷 L4 — Padma Vyuha (Lotus Formation)',
          value: 'Integration shield. Detects unauthorized bot adds and webhook creation. Neutralizes the weapon (kicks bot / deletes webhook) before punishing the attacker.',
          inline: false,
        },
        {
          name: '⚡ L5 — Vajra Vyuha (Thunderbolt)',
          value: 'Slow-burn nuke detector. Tracks weighted action scores over 1 hour. Catches attackers who space actions to evade rate limits. Level 2 admins are NOT exempt.',
          inline: false,
        },
        {
          name: '🔴 L6 — ChakraView (Ultimate Fortress)',
          value: 'Total server lockdown. Snapshots all permissions before engaging, strips @everyone and all channel access, then fully restores on disengage. Auto-triggers on ghost event escalation.',
          inline: false,
        },
      )
      .setFooter({ text: 'npm install @intruder214/torque-antinuke' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

module.exports = new AntinukeCommand();
