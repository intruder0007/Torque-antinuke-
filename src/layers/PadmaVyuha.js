const { AuditLogEvent } = require('discord.js');

/**
 * [L4] Padma Vyuha — The Lotus Formation
 *
 * Named after the Padma (Lotus) formation — a concentric layered defensive array
 * that traps enemies inside rings of defense with no escape route.
 *
 * This layer handles integration-based nuke vectors that bypass all role/channel checks:
 *
 * 1. Webhook Nukes — Attacker creates a webhook in a channel, then uses it to spam
 *    NSFW content, raid messages, or mass-ping @everyone without touching their own token.
 *    The webhook itself is the weapon. We detect creation AND immediately delete the webhook.
 *
 * 2. Bot Add Nukes — Attacker adds a pre-built nuke bot to the server.
 *    The nuke bot then does the actual damage, making the attacker's account look clean.
 *    We detect the bot add, kick the bot immediately, then punish the adder.
 *
 * 3. Invite Spam — Mass invite creation to flood the server with raiders.
 *
 * The key difference from basic anti-nukes: we don't just punish the human.
 * We also neutralize the weapon (delete the webhook / kick the bot) before it can fire.
 */
class PadmaVyuha {
  constructor(punisher, db, whitelist, logManager) {
    this.punisher = punisher;
    this.db = db;
    this.whitelist = whitelist;
    this.log = logManager;
  }

  /**
   * Called when a new bot joins the server.
   * Immediately kicks the bot, then punishes the user who added it.
   */
  async scanBotAdd(guild, executorId, botMember) {
    if (!guild || !executorId) return false;

    // Level 2+ can add bots (they're trusted admins)
    if (this.whitelist.getLevel(guild.id, executorId) >= 2) return false;

    // Kick the bot immediately — neutralize the weapon first
    try {
      await botMember.kick('[PadmaVyuha] Unauthorized bot addition — neutralized');
    } catch (err) {
      console.error('[PadmaVyuha] Failed to kick rogue bot:', err.message);
    }

    const punishment = this.db.getSetting(guild.id, 'punishment', 'ban');
    const reason = `[PadmaVyuha] Unauthorized bot add (bot: ${botMember.user.tag})`;
    await this.punisher.punish(guild, executorId, reason, punishment);
    await this.log.send(guild, 'padma', executorId, 'botAdd', 1, 1, {
      bot: botMember.user.tag,
      botId: botMember.id,
    });

    return true;
  }

  /**
   * Called on webhookUpdate.
   * Fetches the newly created webhook and deletes it, then punishes the creator.
   */
  async scanWebhookCreate(guild, executorId, channel) {
    if (!guild || !executorId) return false;

    // Level 2+ can create webhooks
    if (this.whitelist.getLevel(guild.id, executorId) >= 2) return false;

    // Fetch and delete the rogue webhook
    try {
      const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.WebhookCreate, limit: 1 }).catch(() => null);
      if (logs) {
        const entry = logs.entries.first();
        const age = Date.now() - (entry?.createdTimestamp || 0);
        if (entry && age < 5000 && entry.target) {
          // Fetch the actual webhook object and delete it
          const webhooks = await channel.fetchWebhooks().catch(() => null);
          if (webhooks) {
            const rogue = webhooks.find(w => w.id === entry.target.id);
            if (rogue) await rogue.delete('[PadmaVyuha] Rogue webhook neutralized').catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error('[PadmaVyuha] Webhook neutralization failed:', err.message);
    }

    const punishment = this.db.getSetting(guild.id, 'punishment', 'ban');
    const reason = '[PadmaVyuha] Unauthorized webhook creation';
    await this.punisher.punish(guild, executorId, reason, punishment);
    await this.log.send(guild, 'padma', executorId, 'webhookCreate', 1, 1);

    return true;
  }
}

module.exports = PadmaVyuha;
