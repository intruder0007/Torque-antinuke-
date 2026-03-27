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

> **11 attack vectors blocked. Rolling rate windows. Zero false positives.**
> Built by someone who's been stopping nukers since 2015.

<br/>

</div>

---

## ⚡ Why Torque?

Most anti-nuke packages check a single event and call it a day. Torque tracks **every destructive audit log action** in a rolling time window — meaning a nuker who deletes 2 channels, 3 roles, and bans 5 people in 8 seconds gets caught and punished **before** they finish.

| Feature | Torque | Basic packages |
|---|:---:|:---:|
| Rolling rate windows | ✅ | ❌ |
| Audit log age validation | ✅ | ❌ |
| Role hierarchy safety check | ✅ | ❌ |
| Permission escalation detection | ✅ | ❌ |
| Bot-add nuke vector | ✅ | ❌ |
| Webhook spam detection | ✅ | ❌ |
| Runtime whitelist API | ✅ | ❌ |
| Version update notifier | ✅ | ❌ |
| Owner always immune | ✅ | ❌ |

---

## 📦 Install

```bash
npm install @intruder214/torque-antinuke
```

**Requirements:**
- Node.js `>= 16.11.0`
- discord.js `^14.14.1`
- Bot permissions: `View Audit Log`, `Ban Members`, `Manage Roles`, `Manage Channels`

---

## 🚀 Quick Start

```js
const { Client, GatewayIntentBits } = require("discord.js");
const TorqueAntiNuke = require("@intruder214/torque-antinuke");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildWebhooks,
  ],
});

client.once("ready", () => {
  new TorqueAntiNuke({ client });
  console.log(`✅ Anti-nuke active on ${client.user.tag}`);
});

client.login("YOUR_BOT_TOKEN");
```

That's it. Zero config required — sane defaults out of the box.

---

## 🔧 Full Configuration

```js
const antinuke = new TorqueAntiNuke({
  client,

  // Users who can never be punished (besides the guild owner)
  whitelist: ["OWNER_USER_ID", "TRUSTED_MOD_ID"],

  // Channel ID to send punishment logs to
  logChannel: "1234567890123456789",

  // What to do when a nuker is caught
  // "ban" | "kick" | "strip" (strip all roles)
  punishment: "ban",

  // Rolling time window in milliseconds (default: 10 seconds)
  window: 10000,

  // How many of each action triggers punishment
  limits: {
    channelDelete:       2,   // delete 2 channels → punished
    channelCreate:       3,   // create 3 channels → punished
    roleDelete:          2,
    roleCreate:          3,
    roleDangerousUpdate: 2,   // grant Admin/ManageGuild/etc to a role
    memberBan:           2,
    memberKick:          2,
    webhookCreate:       2,
    botAdd:              1,   // add 1 bot → punished (strict)
    guildUpdate:         1,   // change server name/icon → punished
    emojiDelete:         4,
  },
});
```

---

## 🛡️ Protected Attack Vectors

| Action | Default Limit | What it catches |
|---|:---:|---|
| `channelDelete` | 2 | Mass channel deletion |
| `channelCreate` | 3 | Flooding server with spam channels |
| `roleDelete` | 2 | Wiping all roles |
| `roleCreate` | 3 | Mass role spam |
| `roleDangerousUpdate` | 2 | Giving `@everyone` Administrator |
| `memberBan` | 2 | Mass banning your members |
| `memberKick` | 2 | Mass kicking your members |
| `webhookCreate` | 2 | Webhook spam / NSFW raid vector |
| `botAdd` | 1 | Sneaking in a nuke bot |
| `guildUpdate` | 1 | Changing server name, icon, vanity URL |
| `emojiDelete` | 4 | Wiping all custom emojis |

---

## ⚔️ Punishment Modes

```js
punishment: "ban"   // Permanently bans the nuker (default)
punishment: "kick"  // Kicks — they can rejoin, use carefully
punishment: "strip" // Strips all roles — good for trusted servers
```

---

## 🔌 Runtime API

Manage the whitelist and counters without restarting your bot:

```js
const antinuke = new TorqueAntiNuke({ client, ... });

// Whitelist management
antinuke.addWhitelist("USER_ID");       // Trust a user
antinuke.removeWhitelist("USER_ID");    // Revoke trust
antinuke.isWhitelisted("USER_ID");      // → true / false

// Counter management
antinuke.resetCounters("USER_ID");      // Clear action history for a user
```

### Example: slash command to whitelist a user

```js
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "whitelist") return;

  // Only allow the guild owner to use this
  if (interaction.user.id !== interaction.guild.ownerId) {
    return interaction.reply({ content: "❌ Owner only.", ephemeral: true });
  }

  const target = interaction.options.getUser("user");
  antinuke.addWhitelist(target.id);
  await interaction.reply({ content: `✅ <@${target.id}> is now whitelisted.`, ephemeral: true });
});
```

---

## 🔔 Update Notifications

Torque automatically checks npm for newer versions on startup and logs a warning if you're behind:

```
[TorqueAntiNuke] ⚠ Update available: 1.0.0 → 1.2.0
  Run: npm install @intruder214/torque-antinuke@latest
```

No extra config needed — it runs silently in the background and never blocks startup.

---

## 🧠 How the Rolling Window Works

Traditional anti-nukes use a fixed counter that resets on a timer. Torque uses a **per-action rolling window**:

```
t=0s   nuker deletes channel #1  → count: 1
t=3s   nuker deletes channel #2  → count: 2  ← LIMIT HIT → punished
t=10s  window for #1 expires     → count: 1
t=13s  window for #2 expires     → count: 0
```

This means a nuker can't "wait out" a reset timer by spacing actions slightly apart.

---

## 🔒 Safety Guarantees

- **Guild owner** is always immune — can never be punished
- **The bot itself** is always immune
- **Role hierarchy** is respected — bot won't attempt to ban someone above it in the role list
- **Audit log staleness** — entries older than 3 seconds are ignored to prevent false positives from old actions
- **Graceful failures** — all punishments and log sends are wrapped in try/catch; one failure never crashes your bot

---

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## 📄 License

MIT © [Jalaj Jain](https://github.com/intruder0007)

<div align="center">
<br/>
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:7700ff,100:ff0000&height=100&section=footer" width="100%"/>
</div>
