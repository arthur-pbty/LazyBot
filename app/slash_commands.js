const { REST, Routes } = require("discord.js");

module.exports = async function loadSlashCommands(client, guildId = null) {
  const TOKEN = process.env.BOT_TOKEN;
  const CLIENT_ID = process.env.CLIENT_ID;

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  /* =========================
     1️⃣ COMMANDES GLOBALES
     (uniquement si pas de guildId)
     ========================= */

  if (!guildId) {
    const globalCommands = [];

    for (const command of client.commands.values()) {
      if (command.scope === "guild") continue;
      globalCommands.push(command.data.toJSON());
    }

    try {
      console.log("Refreshing GLOBAL slash commands...");
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: globalCommands }
      );
      console.log("Global slash commands loaded");
    } catch (err) {
      console.error("Global commands error", err);
    }
  }

  /* =========================
     2️⃣ COMMANDES PAR SERVEUR
     ========================= */

  const guildsToProcess = guildId
    ? [client.guilds.cache.get(guildId)]
    : [...client.guilds.cache.values()];

  for (const guild of guildsToProcess) {
    if (!guild) continue;

    const guildCommands = [];

    for (const command of client.commands.values()) {
      if (command.scope === "global") continue;

      if (command.guildCondition) {
        let conditionMet = false;
        try {
          conditionMet = await command.guildCondition(guild.id);
        } catch (err) {
          console.error(
            `Guild condition error for command ${command.name} in guild ${guild.name}`,
            err
          );
        }
        if (!conditionMet) continue;
      }

      guildCommands.push(command.data.toJSON());
    }

    console.log(
      `Refreshing GUILD slash commands for ${guild.name} (${guildCommands.length})`
    );

    try {
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, guild.id),
        { body: guildCommands }
      );
      console.log(`Guild commands updated for ${guild.name}`);
    } catch (err) {
      console.error(`Guild commands error ${guild.name}`, err);
    }
  }
};
