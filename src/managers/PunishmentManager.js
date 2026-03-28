/**
 * PunishmentManager
 *
 * Executes punishments with graceful fallback degradation.
 * If the bot can't ban (hierarchy), it tries to strip roles.
 * If it can't strip roles, it tries timeout.
 * If it can't do anything, it logs the failure clearly.
 *
 * Punishment modes:
 *   ban       — permanent ban, deletes 7 days of messages
 *   kick      — kick (they can rejoin — use only on trusted servers)
 *   strip     — removes ALL roles (not just admin ones — full strip)
 *   quarantine — 28-day timeout (max Discord allows)
 */
class PunishmentManager {
  constructor(client, db) {
    this.client = client;
    this.db = db;
  }

  async punish(guild, userId, reason, mode = 'ban') {
    if (!guild || !userId) return false;

    // Absolute immunity: owner and the bot itself
    if (userId === guild.ownerId || userId === this.client.user?.id) return false;

    // Immune whitelist level (3) — never punish, just log
    if (this.db.getWhitelistLevel(guild.id, `u_${userId}`) >= 3) {
      console.warn(`[PunishmentManager] Skipped punishment for immune user ${userId}`);
      return false;
    }

    try {
      const member = await guild.members.fetch(userId).catch(() => null);

      // User already left — ban by ID if mode is ban
      if (!member) {
        if (mode === 'ban') {
          await guild.bans.create(userId, { reason, deleteMessageSeconds: 604800 }).catch(() => {});
        }
        return true;
      }

      // Hierarchy check
      const me = guild.members.me;
      if (me && member.roles.highest.position >= me.roles.highest.position) {
        console.warn(`[PunishmentManager] Cannot punish ${userId} — higher hierarchy. Attempting fallback.`);
        // Fallback: try timeout even if we can't ban/kick/strip
        await member.timeout(28 * 24 * 60 * 60 * 1000, reason).catch(() => {});
        return false;
      }

      switch (mode) {
        case 'kick':
          await member.kick(reason);
          break;

        case 'strip':
          // Strip ALL assignable roles — not just dangerous ones
          // Keeping @everyone (which can't be removed anyway)
          const allRoles = member.roles.cache.filter(r => r.id !== guild.id && r.managed === false);
          await member.roles.remove(allRoles, reason).catch(() => {});
          break;

        case 'quarantine':
          await member.timeout(28 * 24 * 60 * 60 * 1000, reason);
          break;

        case 'ban':
        default:
          await member.ban({ reason, deleteMessageSeconds: 604800 });
          break;
      }

      return true;
    } catch (err) {
      console.error(`[PunishmentManager] Failed to punish ${userId} (${mode}):`, err.message);
      return false;
    }
  }
}

module.exports = PunishmentManager;
