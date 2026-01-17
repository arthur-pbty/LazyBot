const addCommand = require("../fonctions/addCommand");
const { EmbedBuilder } = require("discord.js");
const db = require("../db");

module.exports = addCommand({
  name: "balance",
  description: "Affiche votre solde ou celui d'un autre utilisateur.",
  aliases: ["bal", "money", "coins", "solde"],
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
          if (err) {
            console.error(`DB error in guildCondition for guild ${guildId}`, err);
            return resolve(false);
          }
          resolve(!!row?.enabled);
        }
      );
    });
  },

  slashOptions: [
    {
      type: "USER",
      name: "utilisateur",
      description: "L'utilisateur dont afficher le solde.",
      required: false,
    },
  ],

  executePrefix: async (client, message, args) => {
    const guildId = message.guild.id;
    const targetUser = message.mentions.users.first() || message.author;

    await showBalance(guildId, targetUser, (embed) => {
      message.reply({ embeds: [embed] });
    }, (errMsg) => {
      message.reply(errMsg);
    });
  },

  executeSlash: async (client, interaction) => {
    const guildId = interaction.guild.id;
    const targetUser = interaction.options.getUser("utilisateur") || interaction.user;

    await showBalance(guildId, targetUser, (embed) => {
      interaction.reply({ embeds: [embed] });
    }, (errMsg) => {
      interaction.reply({ content: errMsg, ephemeral: true });
    });
  },
});

async function showBalance(guildId, user, onSuccess, onError) {
  db.get(
    "SELECT currency_name, currency_symbol FROM economy_config WHERE guild_id = ?",
    [guildId],
    (err, config) => {
      if (err || !config) {
        return onError("Le système d'économie n'est pas configuré sur ce serveur.");
      }

      db.get(
        "SELECT balance, bank FROM user_economy WHERE guild_id = ? AND user_id = ?",
        [guildId, user.id],
        (err, row) => {
          if (err) {
            return onError("Erreur lors de la récupération du solde.");
          }

          const balance = row?.balance || 0;
          const bank = row?.bank || 0;
          const total = balance + bank;

          const embed = new EmbedBuilder()
            .setTitle(`${config.currency_symbol} Solde de ${user.username}`)
            .setColor("#FFD700")
            .setThumbnail(user.displayAvatarURL())
            .addFields(
              { name: "💵 Portefeuille", value: `${balance.toLocaleString()} ${config.currency_name}`, inline: true },
              { name: "🏦 Banque", value: `${bank.toLocaleString()} ${config.currency_name}`, inline: true },
              { name: "💰 Total", value: `${total.toLocaleString()} ${config.currency_name}`, inline: false }
            )
            .setTimestamp();

          onSuccess(embed);
        }
      );
    }
  );
}
