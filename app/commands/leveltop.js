const addCommand = require("../fonctions/addCommand");
const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const db = require("../db");

module.exports = addCommand({
  name: "leveltop",
  description: "Affiche le top 10 des niveaux du serveur.",
  aliases: ["toplevel", "topxp", "leaderboard"],
  permissions: [],
  botOwnerOnly: false,
  dm: false,
  scope: "guild",

  guildCondition: async (guildId) => {
    return new Promise((resolve) => {
      db.get(
        "SELECT enabled FROM levels_config WHERE guild_id = ?",
        [guildId],
        (err, row) => {
          if (err) {
            console.error(`DB error in guildCondition for guild ${guildId}`, err);
            return resolve(false);
          }
          resolve(!!row?.enabled);
        }
      );
    });
  },

  executePrefix: async (client, message, args) => {
    const guildId = message.guild.id;

    db.all(
      `SELECT user_id, xp, level FROM user_levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT 10`,
      [guildId],
      async (err, rows) => {
        if (err) {
          console.error("DB error fetching level top", err);
          return message.reply("Une erreur est survenue en récupérant le classement des niveaux.");
        }

        if (rows.length === 0) {
          return message.reply("Aucun utilisateur n'a encore de niveau dans ce serveur.");
        }

        const embed = new EmbedBuilder()
          .setTitle("🏆 Top 10 des niveaux")
          .setColor("#FFD700")
          .setTimestamp()
          .setDescription(
            rows
              .map(
                (row, index) =>
                  `**${index + 1}.** <@${row.user_id}> - Niveau **${row.level}** (${row.xp} XP)`
              )
              .join("\n")
          );

        await message.reply({ embeds: [embed] });
      }
    );
  },

  executeSlash: async (client, interaction) => {
    const guildId = interaction.guild.id;

    db.all(
      `SELECT user_id, xp, level FROM user_levels WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT 10`,
      [guildId],
      async (err, rows) => {
        if (err) {
          console.error("DB error fetching level top", err);
          return interaction.reply({ content: "Une erreur est survenue en récupérant le classement des niveaux.", ephemeral: true });
        }

        if (rows.length === 0) {
          return interaction.reply({ content: "Aucun utilisateur n'a encore de niveau dans ce serveur.", ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setTitle("🏆 Top 10 des niveaux")
          .setColor("#FFD700")
          .setTimestamp()
          .setDescription(
            rows
              .map(
                (row, index) =>
                  `**${index + 1}.** <@${row.user_id}> - Niveau **${row.level}** (${row.xp} XP)`
              )
              .join("\n")
          );

        await interaction.reply({ embeds: [embed] });
      }
    );
  },

  slashData: new SlashCommandBuilder()
    .setName("leveltop")
    .setDescription("Affiche le top 10 des niveaux du serveur."),
});
