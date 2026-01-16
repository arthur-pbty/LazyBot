const loadSlashCommands = require('./slash_commands.js');
loadSlashCommands();

const db = require("./db");

const { Client, GatewayIntentBits, ActivityType, Events } = require("discord.js");
const e = require('express');

const client = new Client({ intents: Object.values(GatewayIntentBits) });

client.once(Events.ClientReady, () => {
  console.log(`Bot connecté en tant que ${client.user.tag}`);
  client.user.setActivity("LazyBot à votre service !", { type: ActivityType.Custom });
});


client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
});


client.on(Events.GuildMemberAdd, member => {
  db.get(
    "SELECT enabled, channel_id, message FROM welcome_config WHERE guild_id = ?",
    [member.guild.id],
    (err, row) => {
      if (err || !row || !row.enabled) return;

      let msg = row.message;

      msg = msg
        .replace("{user}", member.user.username)
        .replace("{mention}", `<@${member.id}>`)
        .replace("{server}", member.guild.name);

      const channel = member.guild.channels.cache.get(row.channel_id);
      if (channel) {
        channel.send(msg);
      }
    }
  );
  db.get(
    "SELECT enabled, role_id FROM autorole_newuser_config WHERE guild_id = ?",
    [member.guild.id],
    (err, row) => {
      if (err || !row || !row.enabled) return;

      const role = member.guild.roles.cache.get(row.role_id);
      if (role) {
        member.roles.add(role);
      }
    }
  );
});


client.on(Events.GuildMemberRemove, member => {
  db.get(
    "SELECT enabled, channel_id, message FROM goodbye_config WHERE guild_id = ?",
    [member.guild.id],
    (err, row) => {
      if (err || !row || !row.enabled) return;

      let msg = row.message;

      msg = msg
        .replace("{user}", member.user.username)
        .replace("{server}", member.guild.name);

      const channel = member.guild.channels.cache.get(row.channel_id);
      if (channel) {
        channel.send(msg);
      }
    }
  );
});


client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  if (newState.member.user.bot) return;

  const guildId = newState.guild.id;

  db.get(
    "SELECT enabled, role_id, exclude_channel_ids FROM autorole_vocal_config WHERE guild_id = ?",
    [guildId],
    (err, row) => {
      if (err || !row || !row.enabled) return;

      let excludeChannelIds = [];
      try {
        excludeChannelIds = row.exclude_channel_ids
          ? JSON.parse(row.exclude_channel_ids)
          : [];
      } catch (err) {
        console.error("Erreur parsing exclude_channel_ids", err);
        excludeChannelIds = [];
      }
      
      const role = newState.guild.roles.cache.get(row.role_id);
      if (!role) return;

      // User joins a voice channel and it's not excluded et a pas déjà le rôle
      if (newState.channelId && !excludeChannelIds.includes(newState.channelId) && !newState.member.roles.cache.has(role.id)) {
        newState.member.roles.add(role);
      }
      // User leaves a voice channel or joins an excluded one
      else if (!newState.channelId || excludeChannelIds.includes(newState.channelId)) {
        newState.member.roles.remove(role);
      }
    }
  );
});


client.on(Events.MessageCreate, message => {
  if (message.author.bot) return;

  const guildId = message.guild.id;

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
      gain_xp_on_message,
      gain_xp_message_lower_bound,
      gain_xp_message_upper_bound,
      cooldown_xp_message_seconds
    FROM levels_config WHERE guild_id = ?`,
    [guildId],
    (err, row) => {
      if (err || !row || !row.enabled || !row.gain_xp_on_message) return;
      if (row.role_with_without_type === "with") {
        const userRoles = message.member.roles.cache;
        const requiredRoles = JSON.parse(row.role_with_without_xp || "[]");
        if (!requiredRoles.some(roleId => userRoles.has(roleId))) {
          return; // User has an excluded role
        }
      } else if (row.role_with_without_type === "without") {
        const userRoles = message.member.roles.cache;
        const excludedRoles = JSON.parse(row.role_with_without_xp || "[]");
        if (excludedRoles.some(roleId => userRoles.has(roleId))) {
          return; // User does not have any of the required roles
        }
      } else if (row.salon_with_without_type === "with") {
        const channelId = message.channel.id;
        const requiredChannels = JSON.parse(row.salon_with_without_xp || "[]");
        if (!requiredChannels.includes(channelId)) {
          return; // Message not in a required channel
        }
      } else if (row.salon_with_without_type === "without") {
        const channelId = message.channel.id;
        const excludedChannels = JSON.parse(row.salon_with_without_xp || "[]");
        if (excludedChannels.includes(channelId)) {
          return; // Message in an excluded channel
        }
      }
      // Logic to award XP for message goes here
      const now = Date.now();
      db.get(
        `SELECT xp, level, last_xp_message_timestamp FROM user_levels WHERE guild_id = ? AND user_id = ?`,
        [guildId, message.author.id],
        (err, userRow) => {
          if (err) return;
          
          const lastTimestamp = userRow ? userRow.last_xp_message_timestamp || 0 : 0;
          if (now - lastTimestamp < row.cooldown_xp_message_seconds * 1000) {
            return; // Still in cooldown
          }

          const minXp = row.gain_xp_message_lower_bound;
          const maxXp = row.gain_xp_message_upper_bound;
          const xpToAdd = Math.floor(Math.random() * (maxXp - minXp + 1)) + minXp;

          let newXp;
          let newLevel;

          if (userRow) {
            newXp = userRow.xp + xpToAdd;
            newLevel = userRow.level;
          } else {
            newXp = xpToAdd;
            newLevel = 1;
          }
          
          // Level up logic based on xp_courbe_type and multiplier goes here
          const firstLevelXp = 100; // Example base XP for first level ----------------------------------------
          const multiplier = row.multiplier_courbe_for_level;
          let fonction_courbe;
          
          if (row.xp_courbe_type === "constante") {
            fonction_courbe = (level) => firstLevelXp * multiplier;
          } else if (row.xp_courbe_type === "linear") {
            fonction_courbe = (level) => firstLevelXp * (level) * multiplier;
          } else if (row.xp_courbe_type === "quadratic") {
            fonction_courbe = (level) => firstLevelXp * (level) * (level) * multiplier;
          } else if (row.xp_courbe_type === "exponential") {
            fonction_courbe = (level) => firstLevelXp * Math.pow(2, (level - 1)) * multiplier;
          }

          let xpForNextLevel = fonction_courbe(newLevel);
          while (newXp >= xpForNextLevel && (row.level_max === 0 || newLevel < row.level_max)) {
            newXp -= xpForNextLevel;
            newLevel += 1;
            xpForNextLevel = fonction_courbe(newLevel);

            // Announce level up if enabled and meets the criteria
            if (row.level_announcements_enabled && (newLevel % row.level_annoncement_every_level === 0)) {
              const channel = message.guild.channels.cache.get(row.level_announcements_channel_id);
              console.log("Channel for level announcement:", channel);
              if (channel) {
                let announcementMsg = row.level_announcements_message;
                announcementMsg = announcementMsg
                  .replace("{user}", message.author.username)
                  .replace("{mention}", `<@${message.author.id}>`)
                  .replace("{level}", newLevel)
                  .replace("{level-xp}", xpForNextLevel);
                channel.send(announcementMsg);
              }
            }
          }

          db.run(
            `INSERT INTO user_levels (guild_id, user_id, xp, level, last_xp_message_timestamp)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(guild_id, user_id) DO UPDATE SET
               xp = excluded.xp,
               level = excluded.level,
               last_xp_message_timestamp = excluded.last_xp_message_timestamp`,
            [guildId, message.author.id, newXp, newLevel, now]
          );
        }
      );
    }
  );
});

client.login(process.env.BOT_TOKEN);

module.exports = client;
