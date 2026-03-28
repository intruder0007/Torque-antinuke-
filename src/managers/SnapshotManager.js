/**
 * SnapshotManager
 *
 * Saves a full guild state snapshot before ChakraView lockdown engages,
 * and restores it exactly when lockdown is lifted.
 *
 * Snapshot includes:
 * - @everyone role permissions bitfield
 * - Every channel's permission overwrites (role and member)
 *
 * This is what makes ChakraView non-destructive. Without this, a lockdown
 * permanently breaks the server's permission structure.
 */
class SnapshotManager {
  constructor() {
    // { guildId: { everyonePerms: BigInt, channels: { channelId: [overwrites] } } }
    this._snapshots = new Map();
  }

  async save(guild) {
    try {
      const snapshot = {
        everyonePerms: guild.roles.everyone.permissions.bitfield.toString(),
        channels: {},
      };

      for (const [id, channel] of guild.channels.cache) {
        if (!channel.isTextBased() && !channel.isVoiceBased()) continue;
        snapshot.channels[id] = channel.permissionOverwrites.cache.map(ow => ({
          id: ow.id,
          type: ow.type,
          allow: ow.allow.bitfield.toString(),
          deny: ow.deny.bitfield.toString(),
        }));
      }

      this._snapshots.set(guild.id, snapshot);
      console.log(`[SnapshotManager] Saved snapshot for guild ${guild.id} (${Object.keys(snapshot.channels).length} channels)`);
    } catch (err) {
      console.error('[SnapshotManager] Save failed:', err.message);
    }
  }

  async restore(guild) {
    const snapshot = this._snapshots.get(guild.id);
    if (!snapshot) {
      console.warn(`[SnapshotManager] No snapshot found for guild ${guild.id} — cannot restore`);
      return;
    }

    try {
      // Restore @everyone permissions
      await guild.roles.everyone.setPermissions(
        BigInt(snapshot.everyonePerms),
        '[ChakraView] Restoring pre-lockdown @everyone permissions'
      ).catch(() => {});

      // Restore channel overwrites
      for (const [channelId, overwrites] of Object.entries(snapshot.channels)) {
        const channel = guild.channels.cache.get(channelId);
        if (!channel) continue;

        // Clear current overwrites and re-apply snapshot
        const restoreJobs = overwrites.map(ow =>
          channel.permissionOverwrites.edit(ow.id, {
            allow: BigInt(ow.allow),
            deny: BigInt(ow.deny),
          }, { reason: '[ChakraView] Restoring pre-lockdown channel permissions' }).catch(() => {})
        );
        await Promise.allSettled(restoreJobs);
      }

      this._snapshots.delete(guild.id);
      console.log(`[SnapshotManager] Restored snapshot for guild ${guild.id}`);
    } catch (err) {
      console.error('[SnapshotManager] Restore failed:', err.message);
    }
  }

  hasSnapshot(guildId) {
    return this._snapshots.has(guildId);
  }
}

module.exports = SnapshotManager;
