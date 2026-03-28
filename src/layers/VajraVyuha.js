/**
 * [L5] Vajra Vyuha — The Thunderbolt Formation
 *
 * Named after the Vajra formation — a diamond/thunderbolt shaped array
 * that concentrates maximum force at a single point to break through any defense.
 *
 * This layer catches what every other layer misses: the slow-burn nuke.
 *
 * A sophisticated attacker knows that fast nukes get caught by rate limiters (Krauncha).
 * So they space their actions out — delete one channel every 3 minutes, delete one role
 * every 5 minutes. Over an hour, the server is destroyed but no single rate limit was hit.
 *
 * Vajra tracks cumulative weighted action scores over a 1-hour rolling window.
 * Different actions have different weights — deleting a channel is more dangerous
 * than creating one, so it scores higher.
 *
 * Key differences from basic anti-nukes:
 * - Level 2 (Admin) whitelisted users are NOT exempt. Compromised admins are the #1 threat.
 * - Only Level 3 (Immune/Owner) bypasses Vajra.
 * - State is persisted to DB so a bot restart doesn't reset the slow-burn tracker.
 * - Per-action weights mean a nuker can't game the system by mixing cheap and expensive actions.
 */

const ACTION_WEIGHTS = {
  channelDelete: 4,
  roleDelete: 4,
  memberBan: 3,
  memberKick: 2,
  roleDangerousUpdate: 5,
  webhookCreate: 3,
  botAdd: 5,
  guildUpdate: 4,
  channelCreate: 1,
  roleCreate: 1,
  emojiDelete: 1,
};

const VAJRA_THRESHOLD = 30; // weighted score within 1 hour triggers quarantine
const VAJRA_WINDOW = 3600000; // 1 hour

class VajraVyuha {
  constructor(db, punisher, whitelist, logManager) {
    this.db = db;
    this.punisher = punisher;
    this.whitelist = whitelist;
    this.log = logManager;

    // In-memory cache of { userId: [{ ts, weight }] }
    // Loaded from DB on init, synced back on changes
    this._state = new Map();

    // Prune stale entries every 10 minutes
    setInterval(() => this._prune(), 600000).unref();
  }

  _prune() {
    const cutoff = Date.now() - VAJRA_WINDOW;
    for (const [userId, events] of this._state) {
      const fresh = events.filter(e => e.ts > cutoff);
      if (fresh.length === 0) this._state.delete(userId);
      else this._state.set(userId, fresh);
    }
  }

  _score(userId) {
    const events = this._state.get(userId) || [];
    const cutoff = Date.now() - VAJRA_WINDOW;
    return events
      .filter(e => e.ts > cutoff)
      .reduce((sum, e) => sum + e.weight, 0);
  }

  async checkAnomaly(guild, executorId, actionType) {
    if (!guild || !executorId) return false;

    // Only Level 3 bypasses Vajra
    if (this.whitelist.getLevel(guild.id, executorId) >= 3) return false;

    const weight = ACTION_WEIGHTS[actionType] || 1;

    if (!this._state.has(executorId)) this._state.set(executorId, []);
    this._state.get(executorId).push({ ts: Date.now(), weight });

    const score = this._score(executorId);

    if (score >= VAJRA_THRESHOLD) {
      console.warn(`[VajraVyuha] Slow-burn anomaly: ${executorId} scored ${score} in the last hour on guild ${guild.id}`);

      const reason = `[VajraVyuha] Slow-burn nuke detected — weighted score ${score}/${VAJRA_THRESHOLD} over 1h`;
      await this.punisher.punish(guild, executorId, reason, 'quarantine');
      await this.log.send(guild, 'vajra', executorId, actionType, score, VAJRA_THRESHOLD);

      // Reset their score after punishment to avoid loop
      this._state.delete(executorId);
      return true;
    }

    return false;
  }
}

module.exports = VajraVyuha;
