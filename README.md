<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:ff0000,100:7700ff&height=200&section=header&text=Torque%20AntiNuke&fontSize=50&fontColor=ffffff&fontAlignY=38&desc=The%20hardest%20Discord%20security%20package%20on%20npm&descAlignY=58&descSize=16" width="100%"/>

<br/>

[![npm version](https://img.shields.io/npm/v/@intruder214/torque-antinuke?style=for-the-badge&color=ff0000&labelColor=1a1a2e&logo=npm)](https://www.npmjs.com/package/@intruder214/torque-antinuke)
[![npm downloads](https://img.shields.io/npm/dt/@intruder214/torque-antinuke?style=for-the-badge&color=7700ff&labelColor=1a1a2e&logo=npm&label=downloads)](https://www.npmjs.com/package/@intruder214/torque-antinuke)
[![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&labelColor=1a1a2e&logo=discord&logoColor=white)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.11.0-339933?style=for-the-badge&labelColor=1a1a2e&logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-yellow?style=for-the-badge&labelColor=1a1a2e)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/intruder0007/Torque-antinuke-?style=for-the-badge&color=ffd700&labelColor=1a1a2e&logo=github)](https://github.com/intruder0007/Torque-antinuke-)

<br/>

> **6 defense layers. Every bypass vector closed. Ghost events caught. Slow-burn nukes tracked.**
> Built by someone who's been stopping nukers since 2015.

<br/>

</div>

---

## ⚡ What changed in v2.0.0

v2.0.0 is a complete ground-up rewrite. The old single-file approach is gone. Every known anti-nuke bypass vector is now explicitly handled across 6 independent defense layers named after Mahabharata military formations.

| What was broken before | What v2.0.0 does |
|---|---|
| Whitelisted users had full bypass | Levels 1–2 get relaxed limits, not zero limits |
| No role-based whitelist | Full role + user whitelist with level inheritance |
| `@everyone` perm escalation not caught | Makara Vyuha detects and auto-reverts it |
| Webhook created but never deleted | Padma Vyuha deletes the webhook before punishing |
| Rogue bot added but never kicked | Padma Vyuha kicks the bot before punishing the adder |
| Slow-burn nukes evaded rate limits | Vajra Vyuha tracks weighted scores over 1 hour |
| Ghost events (token nukes) undetected | Garuda Vyuha escalates to ChakraView on 3+ ghost events |
| ChakraView broke server permanently | SnapshotManager saves and restores full guild state |
| No per-guild configuration | Full `/setup`, `/limits`, `/bypass`, `/status` commands |

---

## 📦 Install

```bash
npm install @intruder214/torque-antinuke
```

**Requirements:**
- Node.js `>= 16.11.0`
- discord.js `^14.14.1`
- Bot permissions: `View Audit Log`, `Ban Members`, `Manage Roles`, `Manage Channels`, `Moderate Members`

---

## 🚀 Quick Start

```js
const { Client, GatewayIntentBits } = require('discord.js');
const TorqueAntiNuke = require('@intruder214/torque-antinuke');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildMessages,
  ],
});

client.once('ready', () => {
  new TorqueAntiNuke({ client });
  console.log(`Online as ${client.user.tag}`);
});

client.login('YOUR_BOT_TOKEN');
```

Zero config required. All 6 layers activate automatically with sane defaults.

---

## 🔧 Full Configuration

```js
const antinuke = new TorqueAntiNuke({
  client,

  // Path to the persistent JSON database (default: torque-data.json)
  dbPath: './data/torque.json',
});

// Per-guild settings (also configurable via slash commands)
antinuke.setSetting('GUILD_ID', 'logChannel', 'CHANNEL_ID');
antinuke.setSetting('GUILD_ID', 'punishment', 'ban');   // ban | kick | strip | quarantine
antinuke.setSetting('GUILD_ID', 'window', 10000);       // rolling window in ms

// Custom per-action limits
antinuke.setSetting('GUILD_ID', 'limits', {
  channelDelete:       2,
  channelCreate:       3,
  roleDelete:          2,
  roleCreate:          3,
  roleDangerousUpdate: 1,
  memberBan:           2,
  memberKick:          3,
  webhookCreate:       2,
  botAdd:              1,
  guildUpdate:         1,
  emojiDelete:         4,
});
```

---

## 🏛️ The 6-Layer Vyuha Defense System

Each layer is named after a military formation from the Mahabharata. They operate in sequence — every event passes through all relevant layers.

---

### 🦅 L1 — Krauncha Vyuha (Entry Gate)

The first thing every gateway event hits. Runs a **true rolling window** rate limiter using timestamp arrays (not counters) so there's no reset-timer gaming.

**The bypass fix:** Whitelisted users are NOT fully bypassed here. They get relaxed limits:
- Level 1 (Mod): 2× base limit on ban/kick actions
- Level 2 (Admin): 2× base limit on structural actions
- Level 3 (Immune): only true bypass — and Vajra still watches them

A compromised Level 2 admin can still nuke if fully bypassed. Krauncha closes that hole.

---

### 🦅 L2 — Garuda Vyuha (Audit Sentinel)

Reconciles every gateway event against the Discord Audit Log to find the true executor.

**Ghost event detection:** If an action fires (channel deleted) but no fresh audit log entry exists within 3.5 seconds, Garuda flags it as a ghost event. This is the signature of token nukes and self-bot API abuse that bypasses the audit log entirely.

If 3+ ghost events fire on the same guild within 15 seconds, Garuda automatically escalates to ChakraView lockdown.

---

### 🐊 L3 — Makara Vyuha (Crocodile Grip)

Handles the most dangerous bypass vectors that basic anti-nukes completely miss.

**What it catches:**
- Any role gaining `Administrator`, `ManageGuild`, `ManageRoles`, `ManageChannels`, `BanMembers`, `KickMembers`, `ManageWebhooks`, `MentionEveryone`
- `@everyone` being given Administrator (flagged as CRITICAL — force ban regardless of punishment setting)
- Vanity URL changes
- Verification level drops (opens server to raids)

**Auto-revert:** Makara reverts the role's permissions **before** punishing. If the revert fails, it still punishes. The damage is undone first.

---

### 🪷 L4 — Padma Vyuha (Lotus Formation)

Handles integration-based nuke vectors — the ones that make the attacker's account look clean.

**Webhook nukes:** Attacker creates a webhook, uses it to spam NSFW/raid content without touching their own token. Padma fetches and deletes the webhook immediately, then punishes the creator.

**Bot-add nukes:** Attacker adds a pre-built nuke bot. The bot does the damage, the attacker looks innocent. Padma kicks the bot immediately, then punishes the adder.

Level 2+ users can add bots and create webhooks freely (they're trusted admins).

---

### ⚡ L5 — Vajra Vyuha (Thunderbolt)

Catches what every other layer misses: the **slow-burn nuke**.

A sophisticated attacker spaces actions out — delete one channel every 3 minutes, delete one role every 5 minutes. No single rate limit is hit. Over an hour, the server is destroyed.

Vajra tracks **weighted action scores** over a 1-hour rolling window:

| Action | Weight |
|---|:---:|
| `roleDangerousUpdate` | 5 |
| `botAdd` | 5 |
| `channelDelete` | 4 |
| `roleDelete` | 4 |
| `guildUpdate` | 4 |
| `memberBan` | 3 |
| `webhookCreate` | 3 |
| `memberKick` | 2 |
| `channelCreate` | 1 |
| `roleCreate` | 1 |
| `emojiDelete` | 1 |

When a user's weighted score hits **30** within 1 hour, they're quarantined.

**Level 2 admins are NOT exempt from Vajra.** Only Level 3 (Immune/Owner) bypasses it.

---

### 🔴 L6 — ChakraView (Ultimate Fortress)

The last resort. Named after the Chakravyuha — the inescapable spiral formation from the Mahabharata. Once engaged, there is no way out until the owner lifts it.

**Engages automatically when:**
- Garuda detects 3+ ghost events in 15 seconds
- Server owner runs `/chakraview engage`

**What it does:**
1. Takes a full snapshot of all role permissions and channel overwrites
2. Strips all dangerous permissions from `@everyone`
3. Applies deny overwrites on every channel (no view, no send, no connect)
4. Sends an emergency alert to the system channel

**On disengage:** Restores the exact pre-attack snapshot. The server returns to its precise state before the lockdown. No manual permission restoration needed.

---

## ⚔️ Punishment Modes

```js
punishment: 'ban'        // Permanent ban, deletes 7 days of messages (default)
punishment: 'kick'       // Kick — they can rejoin
punishment: 'strip'      // Strips ALL roles (not just admin ones)
punishment: 'quarantine' // 28-day timeout (max Discord allows)
```

---

## 🛡️ Whitelist Levels

| Level | Name | What it bypasses |
|:---:|---|---|
| 0 | None | Nothing — full protection applies |
| 1 | Moderator | 2× rate limit on `memberBan`, `memberKick` |
| 2 | Admin | 2× rate limit on structural actions — **Vajra still watches** |
| 3 | Immune | Bypasses L1/L3/L4 — **Garuda and Vajra still watch** |

Both **users** and **roles** can be whitelisted. User level takes precedence over role level if higher.

`@everyone` cannot be whitelisted — that would bypass protection for the entire server.

---

## 🔌 Runtime API

```js
const antinuke = new TorqueAntiNuke({ client });

// User whitelist
antinuke.setUserWhitelist('GUILD_ID', 'USER_ID', 2);   // set level
antinuke.removeWhitelist('GUILD_ID', 'USER_ID');        // remove

// Role whitelist
antinuke.setRoleWhitelist('GUILD_ID', 'ROLE_ID', 1);

// Effective level check (accounts for role inheritance)
antinuke.getWhitelistLevel('GUILD_ID', 'USER_ID', member.roles.cache);

// Per-guild settings
antinuke.setSetting('GUILD_ID', 'logChannel', 'CHANNEL_ID');
antinuke.setSetting('GUILD_ID', 'punishment', 'ban');
antinuke.setSetting('GUILD_ID', 'window', 10000);

// Manual ChakraView control
await antinuke.activateChakraView(guild, 'reason');
await antinuke.disableChakraView(guild);
```

---

## 🤖 Bot Commands

The `bot/` directory contains a ready-to-use Discord bot that exposes all anti-nuke controls as slash commands.

### Setup

```bash
# 1. Copy the example env file
cp bot/.env.example bot/.env

# 2. Fill in your values
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
GUILD_ID=your_dev_guild_id   # optional — leave blank for global deploy

# 3. Deploy slash commands
npm run deploy

# 4. Start the bot
npm start
```

### Commands

| Command | Description | Who can use |
|---|---|---|
| `/antinuke` | View the full Vyuha architecture overview | Everyone |
| `/status` | Full system status — all layers, config, whitelist count | Manage Guild |
| `/setup logs` | Set the log channel for anti-nuke alerts | Owner |
| `/setup punishment` | Set default punishment mode | Owner |
| `/setup window` | Set the rolling rate-limit window | Owner |
| `/setup view` | View current server configuration | Owner |
| `/limits set` | Set the threshold for a specific action | Owner |
| `/limits view` | View all limits vs defaults | Owner |
| `/limits reset` | Reset all limits to defaults | Owner |
| `/whitelist user` | Set whitelist level for a user | Owner |
| `/whitelist role` | Set whitelist level for a role | Owner |
| `/whitelist list` | List all whitelisted users and roles | Owner |
| `/bypass add` | Grant a role bypass clearance | Owner |
| `/bypass remove` | Remove bypass clearance from a role | Owner |
| `/bypass list` | List all roles with bypass clearance | Owner |
| `/bypass check` | Check a user's effective bypass level | Owner |
| `/reset` | Clear rate-limit counters for a user or all users | Owner |
| `/chakraview engage` | Manually trigger total server lockdown | Owner |
| `/chakraview disengage` | Lift lockdown and restore permissions | Owner |
| `/chakraview status` | Check if lockdown is active | Owner |

---

## 🔒 Security Guarantees

- **Guild owner** is always immune — hardcoded, cannot be overridden
- **The bot itself** is always immune
- **Role hierarchy** is respected — bot won't attempt to punish someone above it
- **Audit log freshness** — entries older than 3.5 seconds are ignored
- **Ghost event escalation** — 3+ untracked events in 15s triggers ChakraView automatically
- **Auto-revert before punish** — Makara reverts dangerous permission changes before executing punishment
- **Snapshot restore** — ChakraView saves full guild state and restores it exactly on disengage
- **Graceful failures** — every punishment and log send is wrapped in try/catch
- **No event loop blocking** — all validation runs through an async queue (EventManager)
- **Persistent state** — Vajra's slow-burn tracker and whitelist data survive bot restarts

---

## 📁 Project Structure

```
@intruder214/torque-antinuke
├── index.js                    # Main entry point
├── update-check.js             # Startup version notifier
├── src/
│   ├── layers/
│   │   ├── KraunchaVyuha.js    # L1 — Rolling rate limiter
│   │   ├── GarudaVyuha.js      # L2 — Audit log sentinel + ghost detection
│   │   ├── MakaraVyuha.js      # L3 — Permission escalation guard
│   │   ├── PadmaVyuha.js       # L4 — Webhook + bot integration shield
│   │   ├── VajraVyuha.js       # L5 — Slow-burn weighted anomaly tracker
│   │   └── ChakraView.js       # L6 — Total lockdown + snapshot restore
│   └── managers/
│       ├── DatabaseManager.js  # In-memory + disk-synced persistent store
│       ├── EventManager.js     # Async queue pipeline
│       ├── LogManager.js       # Rich embed log system
│       ├── PunishmentManager.js# Punishment execution with fallback
│       ├── SnapshotManager.js  # Guild state save/restore for ChakraView
│       └── WhitelistManager.js # User + role multi-tier whitelist
└── bot/
    ├── index.js                # Bot entry point
    ├── deploy.js               # Slash command deployment
    ├── config.json             # Client ID, Guild ID, Developer IDs
    ├── .env.example            # Environment variable template
    ├── handlers/
    │   └── SlashHandler.js     # Auto-loads all commands
    ├── structures/
    │   └── SecureCommand.js    # Abstract base with lockdown + DM guards
    └── commands/antinuke/
        ├── antinuke.js         # Architecture overview
        ├── bypass.js           # Role bypass management
        ├── limits.js           # Per-action threshold config
        ├── lockdown.js         # ChakraView engage/disengage
        ├── reset.js            # Counter reset
        ├── setup.js            # Server configuration
        ├── status.js           # System status
        └── whitelist.js        # User + role whitelist management
```

---

## 🔔 Update Notifications

Torque checks npm for newer versions on startup:

```
[TorqueAntiNuke] update available 2.0.0 → 2.1.0
  npm install @intruder214/torque-antinuke@latest
```

Silent, non-blocking, zero dependencies (uses Node's built-in `https://www.npmjs.com/package/@intruder214/torque-antinuke`).

## 📄 License

MIT © [Jlaj Jain](https://github.com/intruder0007)

<div align="center">
<br/>
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:7700ff,100:ff0000&height=100&section=footer" width="100%"/>
</div>
