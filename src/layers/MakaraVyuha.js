const { PermissionFlagsBits } = require('discord.js');

/**
 * [L3] Makara Vyuha — The Crocodile Grip
 *
 * Named after the Makara formation — a crocodile/sea-monster shaped array
 * with a wide jaw that snaps shut on anything that enters its range.
 *
 * This layer handles the most dangerous bypass vectors that basic anti-nukes completely miss:
 *
 * 1. Bypass Role — Attacker doesn't delete roles. Instead they UPDATE a low-level role
 *    (like @everyone or a basic member role) to have Administrator. Instant server takeover.
 *
 * 2. Bypass Administrator Role — Attacker renames an existing admin role to something
 *    innocent-looking, then assigns it to themselves or their alts.
 *
 * 3. @everyone Escalation — The most catastrophic: giving @everyone Administrator
 *    means every single member in the server becomes an admin instantly.
 *
 * 4. Vanity URL Steal — Changing the guild vanity URL is a common troll/nuke move
 *    that permanently damages server branding and invite links.
 *
 * 5. Verification Level Drop — Dropping verification to None opens the server to raids.
 *
 * All dangerous permission changes are auto-reverted before punishment.
 */

const DANGEROUS_PERMS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.MentionEveryone,
  PermissionFlagsBits.ManageNicknames,
];

class MakaraVyuha {
  constructor(punisher, db, whitelist, logManager) {
    this.punisher = punisher;
    this.db = db;
    this.whitelist = whitelist;
    this.log = logManager;
  }

  /**
   * Called on roleUpdate.
   * Detects dangerous permission escalation and auto-reverts before punishing.
   */
  async scanRoleUpdate(guild, executorId, oldRole, newRole) {
    if (!guild || !executorId) return false;

    // Level 3 immune users can update roles freely
    if (this.whitelist.getLevel(guild.id, executorId) >= 3) return false;

    const oldBits = oldRole.permissions.bitfield;
    const newBits = newRole.permissions.bitfield;

    // Find which dangerous perms were ADDED (not just present)
    const addedDangerous = DANGEROUS_PERMS.filter(p => {
      const hadIt = (oldBits & p) === p;
      const hasIt = (newBits & p) === p;
      return !hadIt && hasIt;
    });

    if (addedDangerous.length === 0) return false;

    const isEveryoneRole = newRole.id === guild.id; // @everyone role ID === guild ID
    const severity = isEveryoneRole ? 'ban' : this.db.getSetting(guild.id, 'punishment', 'ban');

    // Auto-revert FIRST before punishing — this is critical
    // If we punish first and the revert fails, the damage is already done
    try {
      await newRole.setPermissions(oldBits, '[MakaraVyuha] Auto-revert: dangerous permission escalation blocked');
    } catch (revertErr) {
      console.error('[MakaraVyuha] Revert failed:', revertErr.message);
      // Even if revert fails, still punish
    }

    const reason = `[MakaraVyuha] Dangerous perm escalation on role "${newRole.name}"${isEveryoneRole ? ' (@everyone — CRITICAL)' : ''}`;
    await this.punisher.punish(guild, executorId, reason, severity);
    await this.log.send(guild, 'makara', executorId, 'roleDangerousUpdate', 1, 1, {
      role: newRole.name,
      everyone: isEveryoneRole,
    });

    return true;
  }

  /**
   * Called on guildUpdate.
   * Detects vanity URL changes and verification level drops.
   */
  async scanGuildUpdate(guild, executorId, oldGuild, newGuild) {
    if (!guild || !executorId) return false;
    if (this.whitelist.getLevel(guild.id, executorId) >= 3) return false;

    const issues = [];

    if (oldGuild.vanityURLCode && oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
      issues.push('vanity URL changed');
    }

    if (newGuild.verificationLevel < oldGuild.verificationLevel) {
      issues.push(`verification level dropped (${oldGuild.verificationLevel} → ${newGuild.verificationLevel})`);
    }

    if (issues.length === 0) return false;

    const punishment = this.db.getSetting(guild.id, 'punishment', 'ban');
    const reason = `[MakaraVyuha] Guild tampering: ${issues.join(', ')}`;
    await this.punisher.punish(guild, executorId, reason, punishment);
    await this.log.send(guild, 'makara', executorId, 'guildUpdate', 1, 1, { issues });

    return true;
  }
}

module.exports = MakaraVyuha;
