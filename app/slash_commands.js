const { REST, Routes } = require('discord.js');
const db = require('./db');

module.exports = async (client, guildId = null) => {
  const TOKEN = process.env.BOT_TOKEN;
  const CLIENT_ID = process.env.CLIENT_ID;

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  /* =========================
     1️⃣ COMMANDES GLOBALES
     (uniquement si pas de guildId)
     ========================= */

  if (!guildId) {
    const globalCommands = [
      {
        name: 'ping',
        description: 'Replies with Pong!',
      },
    ];

    try {
      console.log('Refreshing GLOBAL slash commands...');
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: globalCommands }
      );
      console.log('Global slash commands loaded');
    } catch (err) {
      console.error('Global commands error', err);
    }
  }

  /* =========================
     2️⃣ COMMANDES PAR SERVEUR
     ========================= */

  const guildsToProcess = guildId
    ? [client.guilds.cache.get(guildId)]
    : client.guilds.cache.values();

  for (const guild of guildsToProcess) {
    if (!guild) continue;

    db.get(
      "SELECT enabled FROM levels_config WHERE guild_id = ?",
      [guild.id],
      async (err, row) => {
        if (err) {
          console.error(`DB error ${guild.name}`, err);
          return;
        }

        const guildCommands = [];

        if (row?.enabled) {
          guildCommands.push(
            {
              name: 'level',
              description: 'Check your level and XP',
            },
            {
              name: 'leveltop',
              description: 'Show the top levels',
            }
          );
        }

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
    );
  }
};
