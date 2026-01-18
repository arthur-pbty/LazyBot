const addCommand = require("../../fonctions/addCommand");
const { EmbedBuilder } = require("discord.js");
const db = require("../../db");

module.exports = addCommand({
  name: "level",
  description: "Affiche votre niveau et XP sur ce serveur.",
  aliases: ["lvl", "xp", "niveau"],
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
    const userId = message.author.id;

    db.get(
      `SELECT xp, level FROM user_levels WHERE guild_id = ? AND user_id = ?`,
      [guildId, userId],
      async (err, row) => {
        if (err) {
          console.error("DB error fetching user level", err);
          return message.reply("Une erreur est survenue en récupérant votre niveau.");
        }

        if (!row) {
          return message.reply("Vous n'avez pas encore de niveau dans ce serveur.");
        }

        const embed = new EmbedBuilder()
          .setTitle(`${message.author.username} — Niveau`)
          .setDescription(`Vous êtes au **niveau ${row.level}** avec **${row.xp} XP**.`)
          .setColor("#00FF00")
          .setTimestamp()
          .setFooter({ text: `ID: ${userId}` });

        await message.reply({ embeds: [embed] });
      }
    );
  },

  executeSlash: async (client, interaction) => {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    db.get(
      `SELECT xp, level FROM user_levels WHERE guild_id = ? AND user_id = ?`,
      [guildId, userId],
      async (err, row) => {
        if (err) {
          console.error("DB error fetching user level", err);
          return interaction.reply({ content: "Une erreur est survenue en récupérant votre niveau.", ephemeral: true });
        }

        if (!row) {
          return interaction.reply({ content: "Vous n'avez pas encore de niveau dans ce serveur.", ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setTitle(`${interaction.user.username} — Niveau`)
          .setDescription(`Vous êtes au **niveau ${row.level}** avec **${row.xp} XP**.`)
          .setColor("#00FF00")
          .setTimestamp()
          .setFooter({ text: `ID: ${userId}` });

        await interaction.reply({ embeds: [embed] });
      }
    );
  },

  slashData: new (require("discord.js").SlashCommandBuilder)()
    .setName("level")
    .setDescription("Affiche votre niveau et XP sur ce serveur."),
});
