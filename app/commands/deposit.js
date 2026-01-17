const addCommand = require("../fonctions/addCommand");
const { EmbedBuilder } = require("discord.js");
const db = require("../db");

module.exports = addCommand({
  name: "deposit",
  description: "Déposez de l'argent à la banque.",
  aliases: ["dep", "deposer"],
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
      description: "Le montant à déposer (nombre ou 'all').",
      required: true,
    },
  ],

  executePrefix: async (client, message, args) => {
    if (!args[0]) return message.reply("Usage : `!deposit <montant|all>`");
    
    await processDeposit(message.guild.id, message.author.id, args[0], (embed) => {
      message.reply({ embeds: [embed] });
    }, (errMsg) => {
      message.reply(errMsg);
    });
  },

  executeSlash: async (client, interaction) => {
    const montant = interaction.options.getString("montant");
    
    await processDeposit(interaction.guild.id, interaction.user.id, montant, (embed) => {
      interaction.reply({ embeds: [embed] });
    }, (errMsg) => {
      interaction.reply({ content: errMsg, ephemeral: true });
    });
  },
});

async function processDeposit(guildId, userId, amountStr, onSuccess, onError) {
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
            amount = currentBalance;
          } else {
            amount = parseInt(amountStr, 10);
          }

          if (isNaN(amount) || amount <= 0) {
            return onError("Veuillez entrer un montant valide.");
          }

          if (amount > currentBalance) {
            return onError(`Vous n'avez pas assez d'argent. Solde actuel : **${currentBalance.toLocaleString()} ${config.currency_name}**`);
          }

          const newBalance = currentBalance - amount;
          const newBank = currentBank + amount;

          db.run(
            `INSERT INTO user_economy (guild_id, user_id, balance, bank)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(guild_id, user_id) DO UPDATE SET
               balance = ?,
               bank = ?`,
            [guildId, userId, newBalance, newBank, newBalance, newBank],
            (err) => {
              if (err) return onError("Erreur lors de la sauvegarde.");

              const embed = new EmbedBuilder()
                .setTitle(`🏦 Dépôt effectué`)
                .setColor("#00FF00")
                .setDescription(`Vous avez déposé **${amount.toLocaleString()} ${config.currency_name}** à la banque.`)
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
