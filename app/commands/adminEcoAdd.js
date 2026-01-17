const addCommand = require("../fonctions/addCommand");
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../db");

module.exports = addCommand({
  name: "adminecoadd",
  description: "Ajoute de l'argent à un utilisateur (admin uniquement).",
  aliases: ["addmoney", "givemoney"],
  permissions: [PermissionFlagsBits.Administrator],
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
      description: "L'utilisateur à qui ajouter l'argent.",
      required: true,
    },
    {
      type: "INTEGER",
      name: "montant",
      description: "Le montant à ajouter.",
      required: true,
    },
  ],

  executePrefix: async (client, message, args) => {
    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply("Veuillez mentionner un utilisateur.");
    
    const amount = parseInt(args[1], 10);
    if (isNaN(amount) || amount <= 0) return message.reply("Veuillez entrer un montant valide.");

    await processAdminAdd(message.guild.id, targetUser, amount, (embed) => {
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

    await processAdminAdd(interaction.guild.id, targetUser, amount, (embed) => {
      interaction.reply({ embeds: [embed] });
    }, (errMsg) => {
      interaction.reply({ content: errMsg, ephemeral: true });
    });
  },
});

async function processAdminAdd(guildId, user, amount, onSuccess, onError) {
  db.get(
    "SELECT currency_name, currency_symbol FROM economy_config WHERE guild_id = ?",
    [guildId],
    (err, config) => {
      if (err || !config) return onError("Le système d'économie n'est pas configuré.");

      db.get(
        "SELECT balance FROM user_economy WHERE guild_id = ? AND user_id = ?",
        [guildId, user.id],
        (err, row) => {
          if (err) return onError("Erreur lors de la récupération des données.");

          const newBalance = (row?.balance || 0) + amount;

          db.run(
            `INSERT INTO user_economy (guild_id, user_id, balance, bank)
             VALUES (?, ?, ?, 0)
             ON CONFLICT(guild_id, user_id) DO UPDATE SET balance = ?`,
            [guildId, user.id, newBalance, newBalance],
            (err) => {
              if (err) return onError("Erreur lors de la sauvegarde.");

              const embed = new EmbedBuilder()
                .setTitle(`${config.currency_symbol} Argent ajouté`)
                .setColor("#00FF00")
                .setDescription(`**${amount.toLocaleString()} ${config.currency_name}** ajouté à ${user}.\n\nNouveau solde : **${newBalance.toLocaleString()} ${config.currency_name}**`)
                .setTimestamp();

              onSuccess(embed);
            }
          );
        }
      );
    }
  );
}
