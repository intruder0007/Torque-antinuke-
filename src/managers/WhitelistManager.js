/**
 * WhitelistManager
 *
 * Handles multi-tier whitelist for both users AND roles.
 *
 * Levels:
 *   0 — None (full protection applies)
 *   1 — Moderator (relaxed limits on member actions: ban/kick)
 *   2 — Admin (relaxed limits on structural actions: channels/roles — still tracked by Vajra)
 *   3 — Immune (bypasses Krauncha, Makara, Padma — Vajra still watches, ChakraView still fires)
 *
 * Role-based whitelist:
 *   If a user holds a whitelisted role, they inherit that role's level.
 *   User-level always takes precedence over role-level if higher.
 *
 * Bypass Role vulnerability fix:
 *   We do NOT grant full bypass at any level. Even Level 3 users are tracked by Garuda.
 *   The only thing Level 3 skips is punishment execution — they still get logged.
 */
class WhitelistManager {
  constructor(db) {
    this.db = db;
  }

  // --- User whitelist ---

  setUserLevel(guildId, userId, level) {
    if (level < 0 || level > 3) throw new Error('[WhitelistManager] Level must be 0–3');
    if (level === 0) {
      this.db.removeWhitelist(guildId, `u_${userId}`);
    } else {
      this.db.setWhitelistInfo(guildId, `u_${userId}`, level);
    }
  }

  getUserLevel(guildId, userId) {
    return this.db.getWhitelistLevel(guildId, `u_${userId}`) || 0;
  }

  // --- Role whitelist ---

  setRoleLevel(guildId, roleId, level) {
    if (level < 0 || level > 3) throw new Error('[WhitelistManager] Level must be 0–3');
    if (level === 0) {
      this.db.removeWhitelist(guildId, `r_${roleId}`);
    } else {
      this.db.setWhitelistInfo(guildId, `r_${roleId}`, level);
    }
  }

  getRoleLevel(guildId, roleId) {
    return this.db.getWhitelistLevel(guildId, `r_${roleId}`) || 0;
  }

  /**
   * Resolves the effective whitelist level for a user.
   * Checks user-level first, then checks all their roles, returns the highest.
   */
  getLevel(guildId, userId, memberRoles = null) {
    let level = this.getUserLevel(guildId, userId);

    if (memberRoles) {
      for (const [roleId] of memberRoles) {
        const roleLevel = this.getRoleLevel(guildId, roleId);
        if (roleLevel > level) level = roleLevel;
      }
    }

    return level;
  }

  /**
   * Lists all whitelisted users and roles for a guild.
   */
  listAll(guildId) {
    const all = this.db.data.whitelists[guildId] || {};
    const users = [];
    const roles = [];

    for (const [key, level] of Object.entries(all)) {
      if (key.startsWith('u_')) users.push({ id: key.slice(2), level });
      else if (key.startsWith('r_')) roles.push({ id: key.slice(2), level });
    }

    return { users, roles };
  }

  isImmune(guildId, userId, memberRoles = null) {
    return this.getLevel(guildId, userId, memberRoles) >= 3;
  }
}

module.exports = WhitelistManager;
