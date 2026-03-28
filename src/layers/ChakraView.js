const { PermissionFlagsBits, OverwriteType } = require('discord.js');

/**
 * [L6] ChakraView — The Ultimate Fortress
 *
 * Named after the Chakravyuha — the most complex and inescapable formation in the Mahabharata.
 * A spiral military array that only Abhimanyu knew how to enter, but not how to exit.
 * Once you're inside, there is no way out.
 *
 * ChakraView is the last resort. It engages when:
 * 1. Multiple lower layers fail simultaneously (ghost event escalation)
 * 2. The server owner manually triggers it via /chakraview engage
 * 3. A hyper-nuke is detected (10+ events in under 3 seconds)
 *
 * What it does:
 * - Takes a full snapshot of all role permissions and channel overwrites BEFORE locking down
 * - Strips ALL dangerous permissions from @everyone
 * - Applies deny overwrites on every channel for @everyone (no view, no send)
 * - Sends an emergency alert to the system channel
 * - On disengage, restores the snapshot so the server returns to its exact pre-attack state
 *
 * The snapshot/restore is what separates this from every other anti-nuke lockdown.
 * Most lockdowns strip permissions and leave the server broken after the threat is gone.
 * ChakraView remembers exactly what the server looked like and puts it back.
 */

const DANGEROUS_PERMS_BITS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.CreateInstantInvite,
  PermissionFlagsBits.MentionEveryone,
];

class ChakraView {
  constructor(client, snapshot) {
    this.client = client;
    this.snapshot = snapshot;

    // Set of guild IDs currently in lockdown
    this.activeLockdowns = new Set();
  }

  async engage(guild, reason = 'Manual activation') {
    if (this.activeLockdowns.has(guild.id)) return;

    console.warn(`[CHAKRAVIEW] LOCKDOWN ENGAGED — Guild: ${guild.id} | Reason: ${reason}`);
    this.activeLockdowns.add(guild.id);

    // Step 1: Take a full snapshot before we touch anything
    await this.snapshot.save(guild);

    try {
      // Step 2: Strip dangerous perms from @everyone
      const everyone = guild.roles.everyone;
      let everyonePerms = everyone.permissions;
      for (const perm of DANGEROUS_PERMS_BITS) {
        everyonePerms = everyonePerms.remove(perm);
      }
      await everyone.setPermissions(everyonePerms, '[ChakraView] Emergency lockdown — @everyone stripped').catch(() => {});

      // Step 3: Apply deny overwrites on every text/voice channel for @everyone
      const channels = guild.channels.cache.filter(c => c.isTextBased() || c.isVoiceBased());
      const overwriteJobs = channels.map(ch =>
        ch.permissionOverwrites.edit(guild.id, {
          ViewChannel: false,
          SendMessages: false,
          Connect: false,
        }, { reason: '[ChakraView] Emergency lockdown' }).catch(() => {})
      );
      await Promise.allSettled(overwriteJobs);

      // Step 4: Send emergency alert
      const alertChannel = guild.systemChannel
        || guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(this.client.user)?.has(PermissionFlagsBits.SendMessages));

      if (alertChannel) {
        await alertChannel.send(
          '🚨 **CHAKRAVIEW LOCKDOWN ACTIVE** 🚨\n\n' +
          'A critical threat has been detected. All channel access and administrative permissions have been suspended server-wide.\n\n' +
          '**Server Owner:** Use `/chakraview disengage` to lift the lockdown and restore all permissions automatically.\n\n' +
          `*Reason: ${reason}*`
        ).catch(() => {});
      }

    } catch (err) {
      console.error('[ChakraView] Lockdown deployment error:', err.message);
    }
  }

  async disengage(guild) {
    if (!this.activeLockdowns.has(guild.id)) return;

    console.log(`[CHAKRAVIEW] LOCKDOWN LIFTED — Guild: ${guild.id}`);
    this.activeLockdowns.delete(guild.id);

    // Restore the snapshot
    await this.snapshot.restore(guild);
  }

  isActive(guildId) {
    return this.activeLockdowns.has(guildId);
  }
}

module.exports = ChakraView;
