const { Events, EmbedBuilder } = require("discord.js");
const db = require("../db");

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(client, member) {
    db.get(
      "SELECT enabled, channel_id, message FROM goodbye_config WHERE guild_id = ?",
      [member.guild.id],
      (err, row) => {
        if (err || !row || !row.enabled) return;
  
        let msg = row.message || "Au revoir {user}, tu vas nous manquer !";
  
        msg = msg
          .replace("{user}", member.user.username)
          .replace("{server}", member.guild.name);
  
        const channel = member.guild.channels.cache.get(row.channel_id);
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle("👋 Au revoir...")
            .setDescription(msg)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

          channel.send({ embeds: [embed] });
        }
      }
    );
  },
};
