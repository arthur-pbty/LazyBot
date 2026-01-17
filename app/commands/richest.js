const addCommand = require("../fonctions/addCommand");
const { EmbedBuilder } = require("discord.js");
const db = require("../db");

module.exports = addCommand({
  name: "richest",
  description: "Affiche le classement des plus riches du serveur.",
  aliases: ["baltop", "leaderboard", "lb", "moneytop"],
  permissions: [],
  botOwnerOnly: false,
  dm: false,
  scope: "guild",

  guildCondition: async (guildId) => {
    return new Promise((resolve) => {
      db.get(
        "SELECT enabled FROM economy_config WHERE guild_id = ?",
        [guildId],
        (err, row) => {
          if (err) return resolve(false);
          resolve(!!row?.enabled);
        }
      );
    });
  },

  slashOptions: [],

  executePrefix: async (client, message, args) => {
    await showLeaderboard(message.guild.id, (embed) => {
      message.reply({ embeds: [embed] });
    }, (errMsg) => {
      message.reply(errMsg);
    });
  },

  executeSlash: async (client, interaction) => {
    await showLeaderboard(interaction.guild.id, (embed) => {
      interaction.reply({ embeds: [embed] });
    }, (errMsg) => {
      interaction.reply({ content: errMsg, ephemeral: true });
    });
  },
});

async function showLeaderboard(guildId, onSuccess, onError) {
  db.get(
    "SELECT currency_name, currency_symbol FROM economy_config WHERE guild_id = ?",
    [guildId],
    (err, config) => {
      if (err || !config) return onError("Le système d'économie n'est pas configuré.");

      db.all(
        `SELECT user_id, (balance + bank) as total FROM user_economy 
         WHERE guild_id = ? ORDER BY total DESC LIMIT 10`,
        [guildId],
        (err, rows) => {
          if (err) return onError("Erreur lors de la récupération du classement.");

          if (!rows || rows.length === 0) {
            return onError("Aucun utilisateur n'a encore d'argent sur ce serveur.");
          }

          const embed = new EmbedBuilder()
            .setTitle(`${config.currency_symbol} Top 10 des plus riches`)
            .setColor("#FFD700")
            .setDescription(
              rows
                .map((row, index) => {
                  const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `**${index + 1}.**`;
                  return `${medal} <@${row.user_id}> - **${row.total.toLocaleString()}** ${config.currency_name}`;
                })
                .join("\n")
            )
            .setTimestamp();

          onSuccess(embed);
        }
      );
    }
  );
}
