const { Events, EmbedBuilder } = require("discord.js");
const db = require("../db");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(client, member) {
    db.get(
      "SELECT enabled, channel_id, message FROM welcome_config WHERE guild_id = ?",
      [member.guild.id],
      (err, row) => {
        if (err || !row || !row.enabled) return;

        let msg = row.message || "Bienvenue {mention} sur {server} !";

        msg = msg
          .replace("{user}", member.user.username)
          .replace("{mention}", `<@${member.id}>`)
          .replace("{server}", member.guild.name);

        const channel = member.guild.channels.cache.get(row.channel_id);
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle("👋 Bienvenue !")
            .setDescription(msg)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

          channel.send({ embeds: [embed] });
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
  },
};
