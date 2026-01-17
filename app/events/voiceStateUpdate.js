const { Events } = require("discord.js");
const db = require("../db");

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(client, oldState, newState) {
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
  },
};
