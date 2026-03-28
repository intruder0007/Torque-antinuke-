/**
 * [L1] Krauncha Vyuha — The Entry Gate
 *
 * Named after the Krauncha formation from Mahabharata — a bird-shaped military array
 * designed to pierce through enemy lines at the front while protecting the flanks.
 *
 * This layer is the first thing every gateway event hits.
 * It runs a rolling token-bucket rate limiter per user per action type.
 *
 * Key design decisions vs typical anti-nukes:
 * - Whitelisted users are NOT fully bypassed here. They get RELAXED limits, not zero limits.
 *   A compromised Level 2 admin can still nuke if fully bypassed — this closes that hole.
 * - Level 3 (Immune/Owner) is the only true bypass, and even then Vajra still watches them.
 * - Limits are per-guild configurable. Defaults are conservative.
 */
class KraunchaVyuha {
  constructor(db, punisher, whitelist, logManager) {
    this.db = db;
    this.punisher = punisher;
    this.whitelist = whitelist;
    this.log = logManager;

    // { userId: { actionType: [timestamps] } }
    // Using timestamp arrays instead of counters so we can do true rolling windows
    this._buckets = new Map();
  }

  _getWindow(guildId) {
    return this.db.getSetting(guildId, 'window', 10000);
  }

  _getLimits(guildId) {
    return this.db.getSetting(guildId, 'limits', {
      channelDelete: 2,
      channelCreate: 3,
      roleDelete: 2,
      roleCreate: 3,
      roleDangerousUpdate: 1,
      memberBan: 2,
      memberKick: 3,
      webhookCreate: 2,
      botAdd: 1,
      guildUpdate: 1,
      emojiDelete: 4,
    });
  }

  // Returns the effective limit for a user based on their whitelist level.
  // Level 0: base limit
  // Level 1 (Mod): 2x base limit for member actions only
  // Level 2 (Admin): 2x base limit for structural actions — NOT a full bypass
  // Level 3 (Immune): skip entirely
  _effectiveLimit(guildId, userId, actionType, baseLimit) {
    const level = this.whitelist.getLevel(guildId, userId);
    if (level >= 3) return Infinity; // true immune

    const modActions = ['memberBan', 'memberKick'];
    const adminActions = ['channelDelete', 'channelCreate', 'roleDelete', 'roleCreate', 'webhookCreate', 'emojiDelete'];

    if (level === 1 && modActions.includes(actionType)) return baseLimit * 2;
    if (level === 2 && adminActions.includes(actionType)) return baseLimit * 2;

    return baseLimit;
  }

  // True rolling window: count timestamps within the last windowMs
  _tick(userId, actionType, windowMs) {
    if (!this._buckets.has(userId)) this._buckets.set(userId, {});
    const bucket = this._buckets.get(userId);
    if (!bucket[actionType]) bucket[actionType] = [];

    const now = Date.now();
    // Prune expired timestamps
    bucket[actionType] = bucket[actionType].filter(t => now - t < windowMs);
    bucket[actionType].push(now);

    return bucket[actionType].length;
  }

  resetUser(userId) {
    this._buckets.delete(userId);
  }

  /**
   * Main intercept method. Called by GarudaVyuha after executor is confirmed.
   * Returns true if the action was malicious and punishment was triggered.
   */
  async intercept(guild, executorId, actionType) {
    if (!guild || !executorId) return false;

    const windowMs = this._getWindow(guild.id);
    const limits = this._getLimits(guild.id);
    const baseLimit = limits[actionType] ?? 3;
    const effectiveLimit = this._effectiveLimit(guild.id, executorId, actionType, baseLimit);

    if (effectiveLimit === Infinity) return false; // Level 3 immune

    const count = this._tick(executorId, actionType, windowMs);

    if (count >= effectiveLimit) {
      const punishment = this.db.getSetting(guild.id, 'punishment', 'ban');
      const reason = `[KraunchaVyuha] ${actionType} — ${count}/${effectiveLimit} in ${windowMs / 1000}s`;

      await this.punisher.punish(guild, executorId, reason, punishment);
      await this.log.send(guild, 'krauncha', executorId, actionType, count, effectiveLimit);

      this.resetUser(executorId); // reset after punishment to avoid ban-loop
      return true;
    }

    return false;
  }
}

module.exports = KraunchaVyuha;
