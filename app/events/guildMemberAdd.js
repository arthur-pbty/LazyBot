const { Events } = require("discord.js");
const db = require("../db");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(client, member) {
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
  },
};
