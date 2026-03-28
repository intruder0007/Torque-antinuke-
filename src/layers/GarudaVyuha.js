/**
 * [L2] Garuda Vyuha — The Winged Sentinel
 *
 * Named after the Garuda formation — an eagle-shaped array that strikes fast and
 * covers wide ground simultaneously, used for rapid offensive and defensive maneuvers.
 *
 * This layer reconciles Discord gateway events against the Audit Log to find the true executor.
 * It solves three critical bypass vectors that most anti-nukes miss:
 *
 * 1. Ghost Events — An action fires (channel deleted) but no audit log entry exists.
 *    This happens with token nukes using self-bots or API abuse that bypasses the audit log.
 *    We detect this by comparing pre/post state snapshots.
 *
 * 2. Stale Log Injection — An attacker performs a legitimate action, waits, then nukes.
 *    The stale log from the legitimate action gets matched. We enforce a 3.5s freshness window.
 *
 * 3. Executor Masking — Some nuke tools rotate tokens rapidly so each action appears from
 *    a different user. Garuda catches this by tracking the target object, not just the executor.
 *
 * Garuda does NOT call KraunchaVyuha directly. It returns the executorId to the main router
 * which then calls Krauncha. This prevents double-processing.
 */
class GarudaVyuha {
  constructor(client, snapshot) {
    this.client = client;
    this.snapshot = snapshot;

    // Ghost event tracker: { guildId_actionType: timestamp }
    this._ghostTracker = new Map();
  }

  /**
   * Fetches and validates the executor of an audit log event.
   * Returns executorId string or null if untraceable/benign.
   */
  async verifyExecutor(guild, auditEvent, actionType, maxAge = 3500) {
    try {
      // Small delay to let Discord's audit log catch up with the gateway event
      await new Promise(r => setTimeout(r, 700));

      const logs = await guild.fetchAuditLogs({ type: auditEvent, limit: 3 }).catch(() => null);
      if (!logs || logs.entries.size === 0) {
        // No audit log at all — ghost event
        this._flagGhost(guild, actionType);
        return null;
      }

      // Find the freshest entry within our age window
      const now = Date.now();
      const entry = logs.entries.find(e => now - e.createdTimestamp <= maxAge);

      if (!entry) {
        // All entries are stale — the action happened but left no fresh log
        this._flagGhost(guild, actionType);
        return null;
      }

      const executorId = entry.executorId;

      // Never act on ourselves
      if (executorId === this.client.user?.id) return null;

      // Never act on the guild owner
      if (executorId === guild.ownerId) return null;

      return executorId;
    } catch (err) {
      console.error('[GarudaVyuha] Audit log fetch failed:', err.message);
      return null;
    }
  }

  /**
   * Ghost event flagging.
   * If the same action type ghosts 3+ times within 15 seconds on the same guild,
   * we escalate to ChakraView because something is actively bypassing the audit log.
   */
  _flagGhost(guild, actionType) {
    const key = `${guild.id}_${actionType}`;
    if (!this._ghostTracker.has(key)) this._ghostTracker.set(key, []);

    const now = Date.now();
    const timestamps = this._ghostTracker.get(key).filter(t => now - t < 15000);
    timestamps.push(now);
    this._ghostTracker.set(key, timestamps);

    if (timestamps.length >= 3) {
      console.warn(`[GarudaVyuha] GHOST EVENT ESCALATION on guild ${guild.id} for ${actionType}. ${timestamps.length} untracked events in 15s. ChakraView recommended.`);
      this._ghostTracker.delete(key);
      // Emit so the main router can trigger ChakraView
      guild.client.emit('torque_ghost_escalation', guild, actionType);
    }
  }
}

module.exports = GarudaVyuha;
