const { Events, ChannelType, PermissionFlagsBits } = require("discord.js");
const db = require("../db");

// Store voice join times and intervals for economy
const voiceJoinTimes = new Map(); // guildId_oderId -> timestamp
const voiceMoneyIntervals = new Map(); // guildId_userId -> intervalId

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(client, oldState, newState) {
    // ===== PRIVATE ROOM (TEMP VOICE CHANNELS) =====
    await handlePrivateRoom(client, oldState, newState);

    if (newState.member.user.bot) return;
    
    const guildId = newState.guild.id;
    const oderId = newState.member.id;
    const key = `${guildId}_${oderId}`;

    // ===== TRACK VOICE TIME STATS =====
    await trackVoiceTime(guildId, oderId, oldState, newState);

    // ===== AUTOROLE VOCAL =====
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
  
        if (newState.channelId && !excludeChannelIds.includes(newState.channelId) && !newState.member.roles.cache.has(role.id)) {
          newState.member.roles.add(role);
        }
        else if (!newState.channelId || excludeChannelIds.includes(newState.channelId)) {
          newState.member.roles.remove(role);
        }
      }
    );

    // ===== ECONOMY VOICE MONEY =====
    db.get(
      `SELECT enabled, voice_money_enabled, voice_money_min, voice_money_max, voice_money_interval_minutes
       FROM economy_config WHERE guild_id = ?`,
      [guildId],
      (err, ecoRow) => {
        if (err || !ecoRow || !ecoRow.enabled || !ecoRow.voice_money_enabled) {
          // Clear interval if economy is disabled
          if (voiceMoneyIntervals.has(key)) {
            clearInterval(voiceMoneyIntervals.get(key));
            voiceMoneyIntervals.delete(key);
            voiceJoinTimes.delete(key);
          }
          return;
        }

        const intervalMs = ecoRow.voice_money_interval_minutes * 60 * 1000;
        const minMoney = ecoRow.voice_money_min;
        const maxMoney = ecoRow.voice_money_max;

        // User joined a voice channel
        if (newState.channelId && !oldState.channelId) {
          voiceJoinTimes.set(key, Date.now());
          
          // Start interval for giving money
          const intervalId = setInterval(() => {
            // Check if user is still in voice
            const member = newState.guild.members.cache.get(oderId);
            if (!member || !member.voice.channelId) {
              clearInterval(intervalId);
              voiceMoneyIntervals.delete(key);
              voiceJoinTimes.delete(key);
              return;
            }

            // Check if user is deafened or muted (optional: don't give money if AFK)
            // You can customize this behavior

            const moneyToAdd = Math.floor(Math.random() * (maxMoney - minMoney + 1)) + minMoney;

            db.get(
              `SELECT balance FROM user_economy WHERE guild_id = ? AND user_id = ?`,
              [guildId, oderId],
              (err, userRow) => {
                if (err) return;
                const newBalance = (userRow?.balance || 0) + moneyToAdd;

                db.run(
                  `INSERT INTO user_economy (guild_id, user_id, balance, bank)
                   VALUES (?, ?, ?, 0)
                   ON CONFLICT(guild_id, user_id) DO UPDATE SET balance = ?`,
                  [guildId, oderId, newBalance, newBalance]
                );
              }
            );
          }, intervalMs);

          voiceMoneyIntervals.set(key, intervalId);
        }
        // User left voice channel
        else if (!newState.channelId && oldState.channelId) {
          if (voiceMoneyIntervals.has(key)) {
            clearInterval(voiceMoneyIntervals.get(key));
            voiceMoneyIntervals.delete(key);
          }
          voiceJoinTimes.delete(key);
        }
      }
    );
  },
};

// ===== PRIVATE ROOM HANDLER =====
async function handlePrivateRoom(client, oldState, newState) {
  const guildId = newState.guild.id;
  const member = newState.member;

  // Récupérer la configuration
  const config = await db.getAsync(
    "SELECT enabled, creator_channel_id, category_id, channel_name_format FROM privateroom_config WHERE guild_id = ?",
    [guildId]
  );

  if (!config || !config.enabled) {
    // Même si désactivé, vérifier si un salon temp doit être supprimé
    await checkAndDeleteEmptyTempChannel(oldState);
    return;
  }

  // Utilisateur rejoint le salon créateur
  if (newState.channelId === config.creator_channel_id) {
    try {
      // Formater le nom du salon
      let channelName = config.channel_name_format || '🔊 Salon de {user}';
      channelName = channelName
        .replace(/{user}/g, member.user.username)
        .replace(/{displayname}/g, member.displayName);

      // Créer le salon vocal
      const newChannel = await newState.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: config.category_id || null,
        permissionOverwrites: [
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.MuteMembers,
              PermissionFlagsBits.DeafenMembers,
              PermissionFlagsBits.MoveMembers,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak
            ]
          }
        ]
      });

      // Enregistrer le salon dans la base de données
      await new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO temp_voice_channels (channel_id, guild_id, owner_id, created_at) VALUES (?, ?, ?, ?)",
          [newChannel.id, guildId, member.id, Date.now()],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Déplacer l'utilisateur dans le nouveau salon
      await member.voice.setChannel(newChannel);
    } catch (err) {
      console.error("Erreur création salon temporaire:", err);
    }
  }

  // Vérifier si l'ancien salon était un salon temporaire vide
  await checkAndDeleteEmptyTempChannel(oldState);
}

async function checkAndDeleteEmptyTempChannel(oldState) {
  if (!oldState.channelId) return;

  const oldChannel = oldState.guild.channels.cache.get(oldState.channelId);
  if (!oldChannel) return;

  // Vérifier si c'est un salon temporaire
  const tempChannel = await db.getAsync(
    "SELECT channel_id FROM temp_voice_channels WHERE channel_id = ?",
    [oldState.channelId]
  );

  if (!tempChannel) return;

  // Vérifier si le salon est vide
  if (oldChannel.members.size === 0) {
    try {
      // Supprimer le salon
      await oldChannel.delete("Salon temporaire vide");
      
      // Supprimer de la base de données
      db.run(
        "DELETE FROM temp_voice_channels WHERE channel_id = ?",
        [oldState.channelId]
      );
    } catch (err) {
      console.error("Erreur suppression salon temporaire:", err);
      // Si le salon n'existe plus, le supprimer quand même de la DB
      db.run(
        "DELETE FROM temp_voice_channels WHERE channel_id = ?",
        [oldState.channelId]
      );
    }
  }
}

// ===== VOICE TIME TRACKING =====
async function trackVoiceTime(guildId, userId, oldState, newState) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // User joined voice channel
  if (newState.channelId && !oldState.channelId) {
    // Save join timestamp
    db.run(
      `INSERT OR REPLACE INTO voice_sessions (guild_id, user_id, join_timestamp)
       VALUES (?, ?, ?)`,
      [guildId, userId, Date.now()]
    );
  }
  // User left voice channel
  else if (!newState.channelId && oldState.channelId) {
    // Get join timestamp and calculate duration
    const session = await db.getAsync(
      "SELECT join_timestamp FROM voice_sessions WHERE guild_id = ? AND user_id = ?",
      [guildId, userId]
    );

    if (session) {
      const durationMs = Date.now() - session.join_timestamp;
      const durationSeconds = Math.floor(durationMs / 1000);

      // Add voice time to stats (in seconds)
      db.run(
        `INSERT INTO user_activity_stats (guild_id, user_id, stat_type, value, date)
         VALUES (?, ?, 'voice_time', ?, ?)
         ON CONFLICT(guild_id, user_id, stat_type, date) DO UPDATE SET value = value + ?`,
        [guildId, userId, durationSeconds, today, durationSeconds]
      );

      // Delete session
      db.run(
        "DELETE FROM voice_sessions WHERE guild_id = ? AND user_id = ?",
        [guildId, userId]
      );
    }
  }
  // User switched channels (still in voice)
  else if (newState.channelId && oldState.channelId && newState.channelId !== oldState.channelId) {
    // Update session timestamp (continue tracking)
    // No action needed, session continues
  }
}
