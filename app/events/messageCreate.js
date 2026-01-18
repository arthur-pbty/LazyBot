const { Events, EmbedBuilder } = require("discord.js");
const db = require("../db");
const antiraid = require("../fonctions/antiraid");

module.exports = {
  name: Events.MessageCreate,
  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild) return;
    
    // ===== ANTI-RAID CHECKS =====
    await antiraid.checkMessage(message, client);
    
    // Si le message a été supprimé par l'antiraid, ne pas continuer
    try {
      await message.fetch();
    } catch {
      return; // Message supprimé
    }
    
    const guildId = message.guild.id;
    const userId = message.author.id;

    // ===== BOT MENTION RESPONSE =====
    if (message.mentions.has(client.user) && !message.content.startsWith('!') && !message.content.startsWith('/')) {
      // Vérifier que ce n'est pas juste une réponse à un message du bot
      if (message.type !== 19 || message.mentions.users.first()?.id === client.user.id) {
        const responses = [
          `Hey ${message.author} ! 👋 Besoin d'aide ? Utilise \`/help\` pour voir mes commandes !`,
          `Salut ${message.author} ! 😊 Tu m'as appelé ? Tape \`/help\` pour découvrir ce que je peux faire !`,
          `Coucou ${message.author} ! ✨ Je suis là pour t'aider ! Essaie \`/help\` pour commencer.`,
          `Yo ${message.author} ! 🎉 Tu voulais me parler ? Utilise \`/help\` pour voir toutes mes commandes !`,
          `${message.author} ! 👀 Oui oui, je suis bien là ! N'hésite pas à utiliser \`/help\` si tu as besoin de moi.`
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        await message.reply({
          content: randomResponse,
          allowedMentions: { repliedUser: true }
        });
        return;
      }
    }

    // ===== TRACK MESSAGE STATS =====
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    db.run(
      `INSERT INTO user_activity_stats (guild_id, user_id, stat_type, value, date)
       VALUES (?, ?, 'messages', 1, ?)
       ON CONFLICT(guild_id, user_id, stat_type, date) DO UPDATE SET value = value + 1`,
      [guildId, userId, today]
    );

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

    // ===== COUNTING SYSTEM =====
    handleCounting(message, guildId);
  },
};

// ===== COUNTING HANDLER =====
async function handleCounting(message, guildId) {
  try {
    const config = await db.getAsync(
      "SELECT enabled, channel_id, current_count, last_user_id FROM counting_config WHERE guild_id = ?",
      [guildId]
    );

    if (!config || !config.enabled || config.channel_id !== message.channel.id) return;

    const content = message.content.trim();
    const number = parseInt(content, 10);

    // Supprimer les messages qui ne sont pas des nombres valides
    if (isNaN(number) || content !== number.toString()) {
      await message.delete().catch(() => {});
      return;
    }

    const expectedNumber = config.current_count + 1;

    // Vérifier que l'utilisateur n'est pas le même que le précédent
    if (config.last_user_id === message.author.id) {
      await message.delete().catch(() => {});
      const errorMsg = await message.channel.send({
        content: `❌ **${message.author.username}**, tu ne peux pas compter deux fois de suite ! Le prochain nombre est toujours **${expectedNumber}**.`
      });
      setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
      return;
    }

    // Vérifier que le nombre est correct
    if (number !== expectedNumber) {
      await message.delete().catch(() => {});
      const errorMsg = await message.channel.send({
        content: `❌ **${message.author.username}**, mauvais nombre ! Le prochain nombre est **${expectedNumber}**.`
      });
      setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
      return;
    }

    // Nombre correct !
    await message.react("✅");
    
    // Mettre à jour le compteur
    db.run(
      "UPDATE counting_config SET current_count = ?, last_user_id = ? WHERE guild_id = ?",
      [number, message.author.id, guildId]
    );

    // Milestones pour les nombres ronds
    if (number % 100 === 0) {
      await message.reply({
        content: `🎉 **${number}** atteint ! Bien joué à tous !`,
        allowedMentions: { repliedUser: false }
      });
    }
  } catch (err) {
    console.error("Erreur counting:", err);
  }
}
