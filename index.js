const { AuditLogEvent } = require('discord.js');
const checkForUpdates = require('./update-check');
const { version } = require('./package.json');

const DatabaseManager   = require('./src/managers/DatabaseManager');
const EventManager      = require('./src/managers/EventManager');
const PunishmentManager = require('./src/managers/PunishmentManager');
const WhitelistManager  = require('./src/managers/WhitelistManager');
const LogManager        = require('./src/managers/LogManager');
const SnapshotManager   = require('./src/managers/SnapshotManager');

const KraunchaVyuha = require('./src/layers/KraunchaVyuha');
const GarudaVyuha   = require('./src/layers/GarudaVyuha');
const MakaraVyuha   = require('./src/layers/MakaraVyuha');
const PadmaVyuha    = require('./src/layers/PadmaVyuha');
const VajraVyuha    = require('./src/layers/VajraVyuha');
const ChakraView    = require('./src/layers/ChakraView');

class TorqueAntiNuke {
  constructor(options = {}) {
    if (!options.client) throw new Error('[TorqueAntiNuke] options.client is required');

    this.client = options.client;

    // Core managers
    this.db       = new DatabaseManager(options.dbPath || 'torque-data.json');
    this.punisher = new PunishmentManager(this.client, this.db);
    this.whitelist = new WhitelistManager(this.db);
    this.logger   = new LogManager(this.db);
    this.snapshot = new SnapshotManager();
    this.queue    = new EventManager();

    // Apply any inline options to the DB as defaults
    if (options.whitelist) {
      // Legacy flat whitelist array support
      for (const id of options.whitelist) {
        this.whitelist.setUserLevel('_global', id, 3);
      }
    }

    // Vyuha defense layers
    this.krauncha = new KraunchaVyuha(this.db, this.punisher, this.whitelist, this.logger);
    this.garuda   = new GarudaVyuha(this.client, this.snapshot);
    this.makara   = new MakaraVyuha(this.punisher, this.db, this.whitelist, this.logger);
    this.padma    = new PadmaVyuha(this.punisher, this.db, this.whitelist, this.logger);
    this.vajra    = new VajraVyuha(this.db, this.punisher, this.whitelist, this.logger);
    this.chakra   = new ChakraView(this.client, this.snapshot);

    checkForUpdates('@intruder214/torque-antinuke', version);
    console.log(`[TorqueAntiNuke] v${version} — 6-Layer Vyuha Defense active`);

    this._listen();
  }

  /**
   * Standard routing pipeline for most events.
   * Garuda verifies the executor → Krauncha rate-limits → Vajra slow-burn tracks.
   */
  _route(guild, auditEvent, actionType) {
    if (!guild?.available) return;

    this.queue.enqueue(async () => {
      const executorId = await this.garuda.verifyExecutor(guild, auditEvent, actionType);
      if (!executorId) return;

      const hit = await this.krauncha.intercept(guild, executorId, actionType);
      if (!hit) {
        // Didn't hit the fast rate limit — still track in Vajra for slow-burn
        await this.vajra.checkAnomaly(guild, executorId, actionType);
      }
    });
  }

  _listen() {
    const cl = this.client;

    // --- Channels ---
    cl.on('channelDelete', ch => ch.guild && this._route(ch.guild, AuditLogEvent.ChannelDelete, 'channelDelete'));
    cl.on('channelCreate', ch => ch.guild && this._route(ch.guild, AuditLogEvent.ChannelCreate, 'channelCreate'));

    // --- Roles ---
    cl.on('roleDelete', role => this._route(role.guild, AuditLogEvent.RoleDelete, 'roleDelete'));
    cl.on('roleCreate', role => this._route(role.guild, AuditLogEvent.RoleCreate, 'roleCreate'));

    // roleUpdate goes through Makara for deep permission analysis
    cl.on('roleUpdate', (oldRole, newRole) => {
      if (!newRole.guild) return;
      this.queue.enqueue(async () => {
        const executorId = await this.garuda.verifyExecutor(newRole.guild, AuditLogEvent.RoleUpdate, 'roleDangerousUpdate');
        if (!executorId) return;
        const caught = await this.makara.scanRoleUpdate(newRole.guild, executorId, oldRole, newRole);
        if (!caught) await this.vajra.checkAnomaly(newRole.guild, executorId, 'roleDangerousUpdate');
      });
    });

    // --- Members ---
    cl.on('guildBanAdd', ban => this._route(ban.guild, AuditLogEvent.MemberBanAdd, 'memberBan'));
    cl.on('guildMemberRemove', member => this._route(member.guild, AuditLogEvent.MemberKick, 'memberKick'));

    // --- Integrations ---
    cl.on('webhookUpdate', ch => {
      if (!ch.guild) return;
      this.queue.enqueue(async () => {
        const executorId = await this.garuda.verifyExecutor(ch.guild, AuditLogEvent.WebhookCreate, 'webhookCreate');
        if (executorId) await this.padma.scanWebhookCreate(ch.guild, executorId, ch);
      });
    });

    cl.on('guildMemberAdd', member => {
      if (!member.user.bot || !member.guild) return;
      this.queue.enqueue(async () => {
        const executorId = await this.garuda.verifyExecutor(member.guild, AuditLogEvent.BotAdd, 'botAdd');
        if (executorId) await this.padma.scanBotAdd(member.guild, executorId, member);
      });
    });

    // --- Guild structural ---
    cl.on('guildUpdate', (oldGuild, newGuild) => {
      if (!newGuild) return;
      this.queue.enqueue(async () => {
        const executorId = await this.garuda.verifyExecutor(newGuild, AuditLogEvent.GuildUpdate, 'guildUpdate');
        if (!executorId) return;
        const caught = await this.makara.scanGuildUpdate(newGuild, executorId, oldGuild, newGuild);
        if (!caught) await this._route(newGuild, AuditLogEvent.GuildUpdate, 'guildUpdate');
      });
    });

    cl.on('emojiDelete', emoji => emoji.guild && this._route(emoji.guild, AuditLogEvent.EmojiDelete, 'emojiDelete'));

    // --- Ghost event escalation from Garuda ---
    // If 3+ untracked events fire in 15s, Garuda emits this and we engage ChakraView
    cl.on('torque_ghost_escalation', async (guild, actionType) => {
      console.warn(`[TorqueAntiNuke] Ghost escalation on ${guild.id} for ${actionType} — engaging ChakraView`);
      await this.chakra.engage(guild, `Ghost event escalation: ${actionType}`);
    });
  }

  // --- Public API ---

  setSetting(guildId, key, value) {
    this.db.setSetting(guildId, key, value);
    return this;
  }

  getSetting(guildId, key, def = null) {
    return this.db.getSetting(guildId, key, def);
  }

  setUserWhitelist(guildId, userId, level) {
    this.whitelist.setUserLevel(guildId, userId, level);
    return this;
  }

  setRoleWhitelist(guildId, roleId, level) {
    this.whitelist.setRoleLevel(guildId, roleId, level);
    return this;
  }

  getWhitelistLevel(guildId, userId, memberRoles = null) {
    return this.whitelist.getLevel(guildId, userId, memberRoles);
  }

  removeWhitelist(guildId, userId) {
    this.whitelist.setUserLevel(guildId, userId, 0);
    return this;
  }

  async activateChakraView(guild, reason) {
    await this.chakra.engage(guild, reason);
  }

  async disableChakraView(guild) {
    await this.chakra.disengage(guild);
  }
}

module.exports = TorqueAntiNuke;
