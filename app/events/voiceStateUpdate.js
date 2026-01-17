const { Events } = require("discord.js");
const db = require("../db");

// Store voice join times and intervals for economy
const voiceJoinTimes = new Map(); // guildId_oderId -> timestamp
const voiceMoneyIntervals = new Map(); // guildId_userId -> intervalId

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(client, oldState, newState) {
    if (newState.member.user.bot) return;
    
    const guildId = newState.guild.id;
    const oderId = newState.member.id;
    const key = `${guildId}_${oderId}`;

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
