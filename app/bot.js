const db = require("./db");

const { Client, GatewayIntentBits, Events } = require("discord.js");

const client = new Client({ intents: Object.values(GatewayIntentBits) });

require("./loader/events.js")(client);
require("./loader/commands.js")(client);


setInterval(() => {
  // vérification des membres vocaux pour leur faire gagner de l'xp
  client.guilds.cache.forEach(guild => {
    guild.members.cache.forEach(member => {
      if (member.user.bot) return;

      const voiceState = member.voice;
      if (!voiceState.channelId) return;

      const guildId = guild.id;

      db.get(
        `SELECT 
          enabled,
          level_announcements_enabled,
          level_announcements_channel_id,
          level_announcements_message,
          xp_courbe_type,
          multiplier_courbe_for_level,
          level_annoncement_every_level,
          level_max,
          role_with_without_type,
          role_with_without_xp,
          salon_with_without_type,
          salon_with_without_xp,
          gain_xp_on_voice,
          gain_voice_xp_lower_bound,
          gain_voice_xp_upper_bound
        FROM levels_config WHERE guild_id = ?`,
        [guildId],
        (err, row) => {
          if (err || !row || !row.enabled || !row.gain_xp_on_voice) return;
          if (row.role_with_without_type === "with") {
            const userRoles = member.roles.cache;
            const requiredRoles = JSON.parse(row.role_with_without_xp || "[]");
            if (!requiredRoles.some(roleId => userRoles.has(roleId))) {
              return; // User has an excluded role
            }
          } else if (row.role_with_without_type === "without") {
            const userRoles = member.roles.cache;
            const excludedRoles = JSON.parse(row.role_with_without_xp || "[]");
            if (excludedRoles.some(roleId => userRoles.has(roleId))) {
              return; // User does not have any of the required roles
            }
          } else if (row.salon_with_without_type === "with") {
            const channelId = voiceState.channelId;
            const requiredChannels = JSON.parse(row.salon_with_without_xp || "[]");
            if (!requiredChannels.includes(channelId)) {
              return; // Not in a required channel
            }
          } else if (row.salon_with_without_type === "without") {
            const channelId = voiceState.channelId;
            const excludedChannels = JSON.parse(row.salon_with_without_xp || "[]");
            if (excludedChannels.includes(channelId)) {
              return; // In an excluded channel
            }
          }

          const minXp = row.gain_voice_xp_lower_bound;
          const maxXp = row.gain_voice_xp_upper_bound;
          const xpToAdd = Math.floor(Math.random() * (maxXp - minXp + 1)) + minXp;

          db.get(
            `SELECT xp, level FROM user_levels WHERE guild_id = ? AND user_id = ?`,
            [guildId, member.id],
            (err, userRow) => {
              if (err) return;

              let newXp;
              let newLevel;

              if (userRow) {
                newXp = userRow.xp + xpToAdd;
                newLevel = userRow.level;
              } else {
                newXp = xpToAdd;
                newLevel = 1;
              }

              // Level up logic
              const multiplier = row.multiplier_courbe_for_level;
              let fonction_courbe;

              if (row.xp_courbe_type === "constante") {
                fonction_courbe = (level) => multiplier;
              } else if (row.xp_courbe_type === "linear") {
                fonction_courbe = (level) => (level) * multiplier;
              } else if (row.xp_courbe_type === "quadratic") {
                fonction_courbe = (level) => (level) * (level) * multiplier;
              } else if (row.xp_courbe_type === "exponential") {
                fonction_courbe = (level) => Math.pow(2, (level - 1)) * multiplier;
              }

              let xpForNextLevel = fonction_courbe(newLevel);
              while (newXp >= xpForNextLevel && (row.level_max === 0 || newLevel < row.level_max)) {
                newXp -= xpForNextLevel;
                newLevel += 1;
                xpForNextLevel = fonction_courbe(newLevel);

                // Announce level up if enabled and meets the criteria
                if (row.level_announcements_enabled && (newLevel % row.level_annoncement_every_level === 0)) {
                  const channel = guild.channels.cache.get(row.level_announcements_channel_id);
                  console.log("Channel for level announcement:", channel);
                  if (channel) {
                    let announcementMsg = row.level_announcements_message;
                    announcementMsg = announcementMsg
                      .replace("{user}", member.user.username)
                      .replace("{mention}", `<@${member.id}>`)
                      .replace("{level}", newLevel)
                      .replace("{level-xp}", xpForNextLevel);
                    channel.send(announcementMsg);
                  }
                }
              }

              db.run(
                `INSERT INTO user_levels (guild_id, user_id, xp, level)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(guild_id, user_id) DO UPDATE SET
                   xp = excluded.xp,
                   level = excluded.level`,
                [guildId, member.id, newXp, newLevel]
              );
            }
          );
        }
      );
    });
  });
}, 60 * 1000); // Toutes les minutes


// ===== STATS CHANNELS UPDATE =====
// Met à jour les noms des salons de statistiques toutes les 5 minutes
async function updateStatsChannels() {
  try {
    const statsChannels = await db.allAsync(`SELECT * FROM stats_channels`);
    
    for (const config of statsChannels) {
      const guild = client.guilds.cache.get(config.guild_id);
      if (!guild) continue;
      
      const channel = guild.channels.cache.get(config.channel_id);
      if (!channel) continue;
      
      let statValue;
      
      switch (config.stat_type) {
        case "members":
          // Total des membres
          statValue = guild.memberCount;
          break;
          
        case "humans":
          // Membres sans les bots
          await guild.members.fetch();
          statValue = guild.members.cache.filter(m => !m.user.bot).size;
          break;
          
        case "bots":
          // Nombre de bots
          await guild.members.fetch();
          statValue = guild.members.cache.filter(m => m.user.bot).size;
          break;
          
        case "online":
          // Membres en ligne (online, idle, dnd)
          await guild.members.fetch({ withPresences: true });
          statValue = guild.members.cache.filter(m => 
            m.presence && ["online", "idle", "dnd"].includes(m.presence.status)
          ).size;
          break;
          
        case "voice":
          // Membres en vocal
          statValue = guild.members.cache.filter(m => m.voice.channelId).size;
          break;
          
        case "roles":
          // Nombre de rôles
          statValue = guild.roles.cache.size;
          break;
          
        case "channels":
          // Nombre de salons
          statValue = guild.channels.cache.size;
          break;
          
        case "boosts":
          // Nombre de boosts
          statValue = guild.premiumSubscriptionCount || 0;
          break;
          
        case "boost_level":
          // Niveau de boost
          statValue = guild.premiumTier;
          break;
          
        case "role_members":
          // Membres ayant un rôle spécifique
          if (config.role_id) {
            await guild.members.fetch();
            const role = guild.roles.cache.get(config.role_id);
            statValue = role ? role.members.size : 0;
          } else {
            statValue = 0;
          }
          break;
          
        default:
          statValue = "?";
      }
      
      // Construire le nouveau nom
      const newName = config.format.replace("{stat}", statValue);
      
      // Ne mettre à jour que si le nom a changé
      if (channel.name !== newName) {
        try {
          await channel.setName(newName);
        } catch (err) {
          console.error(`Erreur lors de la mise à jour du salon ${config.channel_id}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("Erreur updateStatsChannels:", err);
  }
}

// Met à jour uniquement les stats d'un type spécifique pour un serveur
async function updateGuildStats(guildId, statTypes) {
  try {
    const statsChannels = await db.allAsync(
      `SELECT * FROM stats_channels WHERE guild_id = ? AND stat_type IN (${statTypes.map(() => '?').join(',')})`,
      [guildId, ...statTypes]
    );
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    
    for (const config of statsChannels) {
      const channel = guild.channels.cache.get(config.channel_id);
      if (!channel) continue;
      
      let statValue;
      
      switch (config.stat_type) {
        case "members":
          statValue = guild.memberCount;
          break;
        case "humans":
          statValue = guild.members.cache.filter(m => !m.user.bot).size;
          break;
        case "bots":
          statValue = guild.members.cache.filter(m => m.user.bot).size;
          break;
        case "online":
          statValue = guild.members.cache.filter(m => 
            m.presence && ["online", "idle", "dnd"].includes(m.presence.status)
          ).size;
          break;
        case "voice":
          statValue = guild.members.cache.filter(m => m.voice.channelId).size;
          break;
        case "roles":
          statValue = guild.roles.cache.size;
          break;
        case "channels":
          statValue = guild.channels.cache.size;
          break;
        case "boosts":
          statValue = guild.premiumSubscriptionCount || 0;
          break;
        case "boost_level":
          statValue = guild.premiumTier;
          break;
        case "role_members":
          if (config.role_id) {
            const role = guild.roles.cache.get(config.role_id);
            statValue = role ? role.members.size : 0;
          } else {
            statValue = 0;
          }
          break;
        default:
          statValue = "?";
      }
      
      const newName = config.format.replace("{stat}", statValue);
      
      if (channel.name !== newName) {
        try {
          await channel.setName(newName);
        } catch (err) {
          console.error(`Erreur mise à jour salon ${config.channel_id}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("Erreur updateGuildStats:", err);
  }
}

// Debounce pour éviter le rate limiting (Discord limite le renommage de salon à 2 fois par 10 minutes)
const statsDebounceTimers = new Map();
function debounceStatsUpdate(guildId, statTypes, delay = 10000) {
  const key = `${guildId}-${statTypes.sort().join(",")}`;
  
  if (statsDebounceTimers.has(key)) {
    clearTimeout(statsDebounceTimers.get(key));
  }
  
  statsDebounceTimers.set(key, setTimeout(() => {
    updateGuildStats(guildId, statTypes);
    statsDebounceTimers.delete(key);
  }, delay));
}

// ===== ÉVÉNEMENTS POUR LES STATS =====

// Membre rejoint/quitte -> members, humans, bots
client.on("guildMemberAdd", (member) => {
  const types = ["members", "humans"];
  if (member.user.bot) types.push("bots");
  debounceStatsUpdate(member.guild.id, types);
});

client.on("guildMemberRemove", (member) => {
  const types = ["members", "humans"];
  if (member.user.bot) types.push("bots");
  debounceStatsUpdate(member.guild.id, types);
});

// Changement de présence -> online
client.on("presenceUpdate", (oldPresence, newPresence) => {
  if (!newPresence || !newPresence.guild) return;
  const wasOnline = oldPresence && ["online", "idle", "dnd"].includes(oldPresence.status);
  const isOnline = ["online", "idle", "dnd"].includes(newPresence.status);
  if (wasOnline !== isOnline) {
    debounceStatsUpdate(newPresence.guild.id, ["online"]);
  }
});

// Changement vocal -> voice (géré dans voiceStateUpdate.js mais on ajoute ici pour les stats)
client.on("voiceStateUpdate", (oldState, newState) => {
  const guildId = newState.guild?.id || oldState.guild?.id;
  if (!guildId) return;
  // Si rejoint ou quitte un vocal
  if (oldState.channelId !== newState.channelId) {
    debounceStatsUpdate(guildId, ["voice"]);
  }
});

// Rôle créé/supprimé -> roles
client.on("roleCreate", (role) => {
  debounceStatsUpdate(role.guild.id, ["roles"]);
});

client.on("roleDelete", (role) => {
  debounceStatsUpdate(role.guild.id, ["roles"]);
});

// Salon créé/supprimé -> channels
client.on("channelCreate", (channel) => {
  if (channel.guild) debounceStatsUpdate(channel.guild.id, ["channels"]);
});

client.on("channelDelete", (channel) => {
  if (channel.guild) debounceStatsUpdate(channel.guild.id, ["channels"]);
});

// Mise à jour du serveur -> boosts, boost_level
client.on("guildUpdate", (oldGuild, newGuild) => {
  const types = [];
  if (oldGuild.premiumSubscriptionCount !== newGuild.premiumSubscriptionCount) {
    types.push("boosts");
  }
  if (oldGuild.premiumTier !== newGuild.premiumTier) {
    types.push("boost_level");
  }
  if (types.length > 0) {
    debounceStatsUpdate(newGuild.id, types);
  }
});

// Mise à jour membre (rôle ajouté/retiré) -> role_members
client.on("guildMemberUpdate", (oldMember, newMember) => {
  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;
  if (oldRoles.size !== newRoles.size || !oldRoles.every((r, id) => newRoles.has(id))) {
    debounceStatsUpdate(newMember.guild.id, ["role_members"]);
  }
});

// Au démarrage du bot -> toutes les stats
client.once("clientReady", async () => {
  console.log("📊 Mise à jour initiale des salons de statistiques...");
  await updateStatsChannels();
});


// ===== SCHEDULED MESSAGES SYSTEM =====
const { EmbedBuilder } = require("discord.js");

// Track last channel activity
const channelLastActivity = new Map();

// Update last activity on message
client.on("messageCreate", (message) => {
  if (!message.guild || message.author.bot) return;
  channelLastActivity.set(message.channel.id, Date.now());
});

// Process scheduled messages
async function processScheduledMessages() {
  try {
    const messages = await db.allAsync(
      "SELECT * FROM scheduled_messages WHERE enabled = 1"
    );

    // Utiliser le fuseau horaire français
    const now = new Date();
    const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    const currentDay = parisTime.getDay(); // 0-6 (Sunday-Saturday)
    const currentHour = parisTime.getHours().toString().padStart(2, '0');
    const currentMinute = parisTime.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    const currentTimestamp = Date.now();

    for (const msg of messages) {
      try {
        const guild = client.guilds.cache.get(msg.guild_id);
        if (!guild) continue;

        const channel = guild.channels.cache.get(msg.channel_id);
        if (!channel) continue;

        let shouldSend = false;

        if (msg.schedule_type === "weekly") {
          // Check day and time
          const days = JSON.parse(msg.days_of_week || "[]").map(d => parseInt(d));
          const times = JSON.parse(msg.times_of_day || "[]");

          if (days.includes(currentDay) && times.includes(currentTime)) {
            // Check if already sent this minute
            const lastSent = msg.last_sent_at || 0;
            const oneMinuteAgo = currentTimestamp - 60000;
            
            if (lastSent < oneMinuteAgo) {
              shouldSend = true;
            }
          }
        } else if (msg.schedule_type === "interval") {
          // Check interval
          const intervalMs = msg.interval_unit === "hours" 
            ? msg.interval_value * 60 * 60 * 1000 
            : msg.interval_value * 60 * 1000;

          const lastSent = msg.last_sent_at || 0;
          
          if (currentTimestamp - lastSent >= intervalMs) {
            shouldSend = true;
          }
        }

        if (!shouldSend) continue;

        // Check force_send option
        if (!msg.force_send) {
          const lastActivity = channelLastActivity.get(msg.channel_id) || msg.last_channel_activity || 0;
          const lastSent = msg.last_sent_at || 0;
          
          // If no activity since last send, skip
          if (lastActivity <= lastSent) {
            continue;
          }
        }

        // Delete previous message if option enabled
        if (msg.delete_previous && msg.last_message_id) {
          try {
            const oldMessage = await channel.messages.fetch(msg.last_message_id);
            if (oldMessage) await oldMessage.delete();
          } catch (err) {
            // Message may have been deleted already
          }
        }

        // Build message content
        const messageOptions = {};

        if (msg.message_content && msg.message_content.trim()) {
          messageOptions.content = msg.message_content;
        }

        if (msg.embed_enabled) {
          const embed = new EmbedBuilder();
          
          if (msg.embed_title) embed.setTitle(msg.embed_title);
          if (msg.embed_description) embed.setDescription(msg.embed_description);
          if (msg.embed_color) {
            const color = msg.embed_color.startsWith('#') 
              ? parseInt(msg.embed_color.slice(1), 16) 
              : parseInt(msg.embed_color, 16);
            embed.setColor(color);
          }
          embed.setTimestamp();

          messageOptions.embeds = [embed];
        }

        // Send message
        const sentMessage = await channel.send(messageOptions);

        // Update database
        db.run(
          `UPDATE scheduled_messages SET 
            last_sent_at = ?, 
            last_message_id = ?,
            last_channel_activity = ?
          WHERE id = ?`,
          [currentTimestamp, sentMessage.id, channelLastActivity.get(msg.channel_id) || currentTimestamp, msg.id]
        );

        console.log(`📨 Message programmé envoyé: ${msg.id} dans ${channel.name}`);

      } catch (err) {
        console.error(`Erreur envoi message programmé ${msg.id}:`, err);
      }
    }
  } catch (err) {
    console.error("Erreur processScheduledMessages:", err);
  }
}

// Run every minute to check scheduled messages
setInterval(processScheduledMessages, 60 * 1000);

// Initial run after 10 seconds
setTimeout(processScheduledMessages, 10 * 1000);


client.login(process.env.BOT_TOKEN);

module.exports = client;
module.exports.updateGuildStats = updateGuildStats;
