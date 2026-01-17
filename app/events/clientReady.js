const { Events, ActivityType } = require("discord.js");
const loadSlashCommands = require('../slash_commands.js');

module.exports = {
  name: Events.ClientReady,
  async execute(client) {
    console.log(`[READY]  ${client.user.tag} est prêt | ${client.guilds.cache.size} serveurs | ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)} utilisateurs`);
    await loadSlashCommands(client);
    client.user.setActivity("LazyBot à votre service !", { type: ActivityType.Custom });
  }
};