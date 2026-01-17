const { Events, EmbedBuilder } = require("discord.js");
const db = require("../db");

module.exports = {
  name: Events.MessageCreate,
  async execute(client, message) {
    if (message.author.bot) return;
    
    const guildId = message.guild.id;

    // ===== XP SYSTEM =====
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
        
        const roleWithWithoutType = row.role_with_without_type || "without";
        const salonWithWithoutType = row.salon_with_without_type || "without";
        
        if (roleWithWithoutType === "with") {
          const userRoles = message.member.roles.cache;
          const requiredRoles = JSON.parse(row.role_with_without_xp || "[]");
          if (!requiredRoles.some(roleId => userRoles.has(roleId))) {
            return;
          }
        } else if (roleWithWithoutType === "without") {
          const userRoles = message.member.roles.cache;
          const excludedRoles = JSON.parse(row.role_with_without_xp || "[]");
          if (excludedRoles.some(roleId => userRoles.has(roleId))) {
            return;
          }
        }
        
        if (salonWithWithoutType === "with") {
          const channelId = message.channel.id;
          const requiredChannels = JSON.parse(row.salon_with_without_xp || "[]");
          if (!requiredChannels.includes(channelId)) {
            return;
          }
        } else if (salonWithWithoutType === "without") {
          const channelId = message.channel.id;
          const excludedChannels = JSON.parse(row.salon_with_without_xp || "[]");
          if (excludedChannels.includes(channelId)) {
            return;
          }
        }
        
        const now = Date.now();
        db.get(
          `SELECT xp, level, last_xp_message_timestamp FROM user_levels WHERE guild_id = ? AND user_id = ?`,
          [guildId, message.author.id],
          (err, userRow) => {
            if (err) return;
            
            const cooldownSeconds = row.cooldown_xp_message_seconds ?? 60;
            const lastTimestamp = userRow ? userRow.last_xp_message_timestamp || 0 : 0;
            if (now - lastTimestamp < cooldownSeconds * 1000) {
              return;
            }
  
            const minXp = row.gain_xp_message_lower_bound ?? 15;
            const maxXp = row.gain_xp_message_upper_bound ?? 25;
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
            
            const multiplier = row.multiplier_courbe_for_level ?? 100;
            const courbeType = row.xp_courbe_type || "linear";
            let fonction_courbe;
            
            if (courbeType === "constante") {
              fonction_courbe = (level) => multiplier;
            } else if (courbeType === "linear") {
              fonction_courbe = (level) => (level) * multiplier;
            } else if (courbeType === "quadratic") {
              fonction_courbe = (level) => (level) * (level) * multiplier;
            } else if (courbeType === "exponential") {
              fonction_courbe = (level) => Math.pow(2, (level - 1)) * multiplier;
            } else {
              // Fallback au cas où
              fonction_courbe = (level) => (level) * multiplier;
            }
  
            let xpForNextLevel = fonction_courbe(newLevel);
            while (newXp >= xpForNextLevel && (row.level_max === 0 || newLevel < row.level_max)) {
              newXp -= xpForNextLevel;
              newLevel += 1;
              xpForNextLevel = fonction_courbe(newLevel);
  
              if (row.level_announcements_enabled && (newLevel % row.level_annoncement_every_level === 0)) {
                const channel = message.guild.channels.cache.get(row.level_announcements_channel_id);
                if (channel) {
                  let announcementMsg = row.level_announcements_message || "🎉 {mention} a atteint le niveau {level} !";
                  announcementMsg = announcementMsg
                    .replace("{user}", message.author.username)
                    .replace("{mention}", `<@${message.author.id}>`)
                    .replace("{level}", newLevel)
                    .replace("{level-xp}", xpForNextLevel);

                  const embed = new EmbedBuilder()
                    .setColor(0xFEE75C)
                    .setTitle("🎉 Level Up !")
                    .setDescription(announcementMsg)
                    .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 256 }))
                    .addFields(
                      { name: "Nouveau niveau", value: `${newLevel}`, inline: true },
                      { name: "XP pour le prochain", value: `${xpForNextLevel}`, inline: true }
                    )
                    .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
                    .setTimestamp();

                  // @ mention car c'est une notification importante
                  channel.send({ content: `<@${message.author.id}>`, embeds: [embed] });
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

    // ===== ECONOMY MESSAGE MONEY =====
    db.get(
      `SELECT enabled, message_money_enabled, message_money_min, message_money_max, message_money_cooldown_seconds
       FROM economy_config WHERE guild_id = ?`,
      [guildId],
      (err, ecoRow) => {
        if (err || !ecoRow || !ecoRow.enabled || !ecoRow.message_money_enabled) return;

        const now = Date.now();
        db.get(
          `SELECT balance, last_message_money_timestamp FROM user_economy WHERE guild_id = ? AND user_id = ?`,
          [guildId, message.author.id],
          (err, userEcoRow) => {
            if (err) return;

            const lastTimestamp = userEcoRow?.last_message_money_timestamp || 0;
            if (now - lastTimestamp < ecoRow.message_money_cooldown_seconds * 1000) {
              return; // Still in cooldown
            }

            const minMoney = ecoRow.message_money_min;
            const maxMoney = ecoRow.message_money_max;
            const moneyToAdd = Math.floor(Math.random() * (maxMoney - minMoney + 1)) + minMoney;
            const newBalance = (userEcoRow?.balance || 0) + moneyToAdd;

            db.run(
              `INSERT INTO user_economy (guild_id, user_id, balance, bank, last_message_money_timestamp)
               VALUES (?, ?, ?, 0, ?)
               ON CONFLICT(guild_id, user_id) DO UPDATE SET
                 balance = ?,
                 last_message_money_timestamp = ?`,
              [guildId, message.author.id, newBalance, now, newBalance, now]
            );
          }
        );
      }
    );
  },
};
