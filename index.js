const { AuditLogEvent, PermissionFlagsBits } = require("discord.js");
const checkForUpdates = require("./update-check");
const { version } = require("./package.json");

const DANGEROUS_PERMS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.ManageWebhooks,
];

const DEFAULT_LIMITS = {
  channelDelete: 2,
  channelCreate: 3,
  roleDelete: 2,
  roleCreate: 3,
  roleDangerousUpdate: 2,
  memberBan: 2,
  memberKick: 2,
  webhookCreate: 2,
  botAdd: 1,
  guildUpdate: 1,
  emojiDelete: 4,
};

class TorqueAntiNuke {
  constructor(options = {}) {
    if (!options.client) throw new Error("[TorqueAntiNuke] client is required");

    this.client = options.client;
    this.whitelist = new Set(options.whitelist || []);
    this.logChannel = options.logChannel || null;
    this.limits = { ...DEFAULT_LIMITS, ...(options.limits || {}) };
    this.window = options.window ?? 10000;
    this.punishment = options.punishment || "ban";
    this._counters = new Map();

    checkForUpdates("@intruder214/torque-antinuke", version);
    this._listen();
  }

  _tick(userId, type) {
    if (!this._counters.has(userId)) this._counters.set(userId, {});
    const bucket = this._counters.get(userId);
    bucket[type] = (bucket[type] || 0) + 1;
    setTimeout(() => { if (bucket[type] > 0) bucket[type]--; }, this.window);
    return bucket[type];
  }

  async _punish(guild, userId, reason) {
    if (userId === guild.ownerId || userId === this.client.user?.id) return;

    try {
      const member = await guild.members.fetch(userId).catch(() => null);

      if (!member) {
        await guild.bans.create(userId, { reason }).catch(() => {});
        return;
      }

      const me = guild.members.me;
      if (me && member.roles.highest.position >= me.roles.highest.position) {
        this._log(guild, `⚠️ Can't punish <@${userId}> — they're above me in the hierarchy`);
        return;
      }

      if (this.punishment === "kick") await member.kick(reason);
      else if (this.punishment === "strip") await member.roles.set([], reason);
      else await member.ban({ reason, deleteMessageSeconds: 0 });
    } catch (err) {
      console.error(`[TorqueAntiNuke] failed to punish ${userId}:`, err.message);
    }
  }

  _log(guild, msg) {
    if (!this.logChannel) return;
    const ch = guild.channels.cache.get(this.logChannel);
    if (ch?.isTextBased()) ch.send(msg).catch(() => {});
  }

  async _getExecutor(guild, event) {
    try {
      const logs = await guild.fetchAuditLogs({ type: event, limit: 1 });
      const entry = logs.entries.first();
      if (!entry || Date.now() - entry.createdTimestamp > 3000) return null;
      return entry.executor;
    } catch {
      return null;
    }
  }

  async _check(guild, event, type) {
    const executor = await this._getExecutor(guild, event);
    if (!executor) return;
    if (executor.id === guild.ownerId || executor.id === this.client.user?.id) return;
    if (this.whitelist.has(executor.id)) return;

    const count = this._tick(executor.id, type);
    const limit = this.limits[type] ?? 3;

    if (count >= limit) {
      const reason = `[TorqueAntiNuke] ${type} limit hit (${count}/${limit})`;
      await this._punish(guild, executor.id, reason);
      this._log(guild, `🚨 <@${executor.id}> punished for **${type}** — ${count} actions in ${this.window / 1000}s`);
    }
  }

  _listen() {
    const { client: cl } = this;

    cl.on("channelDelete", ch => ch.guild && this._check(ch.guild, AuditLogEvent.ChannelDelete, "channelDelete"));
    cl.on("channelCreate", ch => ch.guild && this._check(ch.guild, AuditLogEvent.ChannelCreate, "channelCreate"));

    cl.on("roleDelete", role => this._check(role.guild, AuditLogEvent.RoleDelete, "roleDelete"));
    cl.on("roleCreate", role => this._check(role.guild, AuditLogEvent.RoleCreate, "roleCreate"));

    cl.on("roleUpdate", (old, updated) => {
      const gained = updated.permissions.missing(old.permissions);
      if (DANGEROUS_PERMS.some(p => gained.includes(p)))
        this._check(updated.guild, AuditLogEvent.RoleUpdate, "roleDangerousUpdate");
    });

    cl.on("guildBanAdd", ban => this._check(ban.guild, AuditLogEvent.MemberBanAdd, "memberBan"));

    cl.on("guildMemberRemove", member => this._check(member.guild, AuditLogEvent.MemberKick, "memberKick"));

    cl.on("webhookUpdate", ch => ch.guild && this._check(ch.guild, AuditLogEvent.WebhookCreate, "webhookCreate"));

    cl.on("guildMemberAdd", member => {
      if (member.user.bot) this._check(member.guild, AuditLogEvent.BotAdd, "botAdd");
    });

    cl.on("guildUpdate", (_, updated) => this._check(updated, AuditLogEvent.GuildUpdate, "guildUpdate"));

    cl.on("emojiDelete", emoji => this._check(emoji.guild, AuditLogEvent.EmojiDelete, "emojiDelete"));
  }

  addWhitelist(userId) { this.whitelist.add(userId); return this; }
  removeWhitelist(userId) { this.whitelist.delete(userId); return this; }
  isWhitelisted(userId) { return this.whitelist.has(userId); }
  resetCounters(userId) { this._counters.delete(userId); return this; }
}

module.exports = TorqueAntiNuke;
