const { Events } = require("discord.js");
const db = require("../db");

module.exports = {
  name: Events.MessageCreate,
  async execute(client, message) {
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
  },
};
