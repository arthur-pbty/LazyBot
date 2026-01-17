const { Events } = require("discord.js");
const db = require("../db");

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(client, member) {
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
  },
};
