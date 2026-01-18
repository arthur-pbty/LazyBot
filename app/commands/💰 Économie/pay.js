const addCommand = require("../../fonctions/addCommand");
const { EmbedBuilder } = require("discord.js");
const db = require("../../db");

module.exports = addCommand({
  name: "pay",
  description: "Envoyez de l'argent à un autre utilisateur.",
  aliases: ["give", "transfer", "envoyer"],
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
      type: "USER",
      name: "utilisateur",
      description: "L'utilisateur à qui envoyer l'argent.",
      required: true,
    },
    {
      type: "INTEGER",
      name: "montant",
      description: "Le montant à envoyer.",
      required: true,
    },
  ],

  executePrefix: async (client, message, args) => {
    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply("Veuillez mentionner un utilisateur.");
    
    const amount = parseInt(args[1], 10);
    if (isNaN(amount) || amount <= 0) return message.reply("Veuillez entrer un montant valide.");

    await processPay(message.guild.id, message.author, targetUser, amount, (embed) => {
      message.reply({ embeds: [embed] });
    }, (errMsg) => {
      message.reply(errMsg);
    });
  },

  executeSlash: async (client, interaction) => {
    const targetUser = interaction.options.getUser("utilisateur");
    const amount = interaction.options.getInteger("montant");

    if (amount <= 0) {
      return interaction.reply({ content: "Le montant doit être positif.", ephemeral: true });
    }

    await processPay(interaction.guild.id, interaction.user, targetUser, amount, (embed) => {
      interaction.reply({ embeds: [embed] });
    }, (errMsg) => {
      interaction.reply({ content: errMsg, ephemeral: true });
    });
  },
});

async function processPay(guildId, sender, receiver, amount, onSuccess, onError) {
  if (sender.id === receiver.id) {
    return onError("Vous ne pouvez pas vous envoyer de l'argent à vous-même.");
  }

  if (receiver.bot) {
    return onError("Vous ne pouvez pas envoyer de l'argent à un bot.");
  }

  db.get(
    "SELECT currency_name, currency_symbol FROM economy_config WHERE guild_id = ?",
    [guildId],
    (err, config) => {
      if (err || !config) return onError("Le système d'économie n'est pas configuré.");

      db.get(
        "SELECT balance FROM user_economy WHERE guild_id = ? AND user_id = ?",
        [guildId, sender.id],
        (err, senderRow) => {
          if (err) return onError("Erreur lors de la récupération des données.");

          const senderBalance = senderRow?.balance || 0;

          if (amount > senderBalance) {
            return onError(`Vous n'avez pas assez d'argent. Solde : **${senderBalance.toLocaleString()} ${config.currency_name}**`);
          }

          db.get(
            "SELECT balance FROM user_economy WHERE guild_id = ? AND user_id = ?",
            [guildId, receiver.id],
            (err, receiverRow) => {
              if (err) return onError("Erreur lors de la récupération des données.");

              const receiverBalance = receiverRow?.balance || 0;
              const newSenderBalance = senderBalance - amount;
              const newReceiverBalance = receiverBalance + amount;

              // Update sender
              db.run(
                `INSERT INTO user_economy (guild_id, user_id, balance, bank)
                 VALUES (?, ?, ?, 0)
                 ON CONFLICT(guild_id, user_id) DO UPDATE SET balance = ?`,
                [guildId, sender.id, newSenderBalance, newSenderBalance],
                (err) => {
                  if (err) return onError("Erreur lors de la sauvegarde.");

                  // Update receiver
                  db.run(
                    `INSERT INTO user_economy (guild_id, user_id, balance, bank)
                     VALUES (?, ?, ?, 0)
                     ON CONFLICT(guild_id, user_id) DO UPDATE SET balance = ?`,
                    [guildId, receiver.id, newReceiverBalance, newReceiverBalance],
                    (err) => {
                      if (err) return onError("Erreur lors de la sauvegarde.");

                      const embed = new EmbedBuilder()
                        .setTitle(`${config.currency_symbol} Transfert effectué`)
                        .setColor("#00FF00")
                        .setDescription(`Vous avez envoyé **${amount.toLocaleString()} ${config.currency_name}** à ${receiver}.`)
                        .addFields(
                          { name: "Votre nouveau solde", value: `${newSenderBalance.toLocaleString()} ${config.currency_name}`, inline: true }
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
      );
    }
  );
}
