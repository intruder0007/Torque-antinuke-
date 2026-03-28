const fs = require('fs');
const path = require('path');

/**
 * High-performance In-Memory Database for rapid Discord Anti-Nuke state tracking.
 * Syncs to disk passively to avoid event-loop blocking.
 */
class DatabaseManager {
  constructor(filePath = 'torque-data.json', syncInterval = 10000) {
    this.dbFile = path.resolve(process.cwd(), filePath);
    this.data = {
      whitelists: {}, // { guildId: { userId: level } }
      settings: {}, // { guildId: { logChannel, limits, etc } }
    };
    this._dirty = false;

    this._load();
    this._startSync(syncInterval);
  }

  _load() {
    if (fs.existsSync(this.dbFile)) {
      try {
        const raw = fs.readFileSync(this.dbFile, 'utf8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error('[TorqueAntiNuke:DB] Corrupt database file. Rebuilding.');
        this.data = { whitelists: {}, settings: {} };
      }
    } else {
      this._saveSync();
    }
  }

  _saveSync() {
    try {
      fs.writeFileSync(this.dbFile, JSON.stringify(this.data, null, 2), 'utf8');
      this._dirty = false;
    } catch (err) {
      console.error('[TorqueAntiNuke:DB] Failed to save DB synchronously:', err.message);
    }
  }

  _startSync(interval) {
    setInterval(() => {
      if (this._dirty) {
        fs.writeFile(this.dbFile, JSON.stringify(this.data, null, 2), 'utf8', (err) => {
          if (err) console.error('[TorqueAntiNuke:DB] Async save failed:', err.message);
          else this._dirty = false;
        });
      }
    }, interval).unref();
  }

  // --- Setting operations ---
  setSetting(guildId, key, value) {
    if (!this.data.settings[guildId]) this.data.settings[guildId] = {};
    this.data.settings[guildId][key] = value;
    this._dirty = true;
  }

  getSetting(guildId, key, def = null) {
    return this.data.settings[guildId]?.[key] ?? def;
  }

  // --- Whitelist operations ---
  setWhitelistInfo(guildId, userId, level) {
    if (!this.data.whitelists[guildId]) this.data.whitelists[guildId] = {};
    this.data.whitelists[guildId][userId] = level;
    this._dirty = true;
  }

  getWhitelistLevel(guildId, userId) {
    return this.data.whitelists[guildId]?.[userId] || 0;
  }

  removeWhitelist(guildId, userId) {
    if (this.data.whitelists[guildId] && this.data.whitelists[guildId][userId]) {
      delete this.data.whitelists[guildId][userId];
      this._dirty = true;
      return true;
    }
    return false;
  }
}

module.exports = DatabaseManager;
