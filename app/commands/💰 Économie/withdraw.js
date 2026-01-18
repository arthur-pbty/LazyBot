const addCommand = require("../../fonctions/addCommand");
const { EmbedBuilder } = require("discord.js");
const db = require("../../db");

module.exports = addCommand({
  name: "withdraw",
  description: "Retirez de l'argent de la banque.",
  aliases: ["with", "retirer"],
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

  slashOptions: [
    {
      type: "STRING",
      name: "montant",
      description: "Le montant à retirer (nombre ou 'all').",
      required: true,
    },
  ],

  executePrefix: async (client, message, args) => {
    if (!args[0]) return message.reply("Usage : `!withdraw <montant|all>`");
    
    await processWithdraw(message.guild.id, message.author.id, args[0], (embed) => {
      message.reply({ embeds: [embed] });
    }, (errMsg) => {
      message.reply(errMsg);
    });
  },

  executeSlash: async (client, interaction) => {
    const montant = interaction.options.getString("montant");
    
    await processWithdraw(interaction.guild.id, interaction.user.id, montant, (embed) => {
      interaction.reply({ embeds: [embed] });
    }, (errMsg) => {
      interaction.reply({ content: errMsg, ephemeral: true });
    });
  },
});

async function processWithdraw(guildId, userId, amountStr, onSuccess, onError) {
  db.get(
    "SELECT currency_name, currency_symbol FROM economy_config WHERE guild_id = ?",
    [guildId],
    (err, config) => {
      if (err || !config) return onError("Le système d'économie n'est pas configuré.");

      db.get(
        "SELECT balance, bank FROM user_economy WHERE guild_id = ? AND user_id = ?",
        [guildId, userId],
        (err, row) => {
          if (err) return onError("Erreur lors de la récupération des données.");

          const currentBalance = row?.balance || 0;
          const currentBank = row?.bank || 0;

          let amount;
          if (amountStr.toLowerCase() === "all") {
            amount = currentBank;
          } else {
            amount = parseInt(amountStr, 10);
          }

          if (isNaN(amount) || amount <= 0) {
            return onError("Veuillez entrer un montant valide.");
          }

          if (amount > currentBank) {
            return onError(`Vous n'avez pas assez d'argent en banque. Solde banque : **${currentBank.toLocaleString()} ${config.currency_name}**`);
          }

          const newBalance = currentBalance + amount;
          const newBank = currentBank - amount;

          db.run(
            `UPDATE user_economy SET balance = ?, bank = ? WHERE guild_id = ? AND user_id = ?`,
            [newBalance, newBank, guildId, userId],
            (err) => {
              if (err) return onError("Erreur lors de la sauvegarde.");

              const embed = new EmbedBuilder()
                .setTitle(`🏦 Retrait effectué`)
                .setColor("#00FF00")
                .setDescription(`Vous avez retiré **${amount.toLocaleString()} ${config.currency_name}** de la banque.`)
                .addFields(
                  { name: "💵 Portefeuille", value: `${newBalance.toLocaleString()} ${config.currency_name}`, inline: true },
                  { name: "🏦 Banque", value: `${newBank.toLocaleString()} ${config.currency_name}`, inline: true }
                )
                .setTimestamp();

              onSuccess(embed);
            }
          );
        }
      );
    }
  );
}
