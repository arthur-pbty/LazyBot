const addCommand = require("../../fonctions/addCommand");
const { EmbedBuilder } = require("discord.js");
const db = require("../../db");

module.exports = addCommand({
  name: "daily",
  description: "Récupérez votre récompense quotidienne.",
  aliases: ["quotidien", "journalier"],
  permissions: [],
  botOwnerOnly: false,
  dm: false,
  scope: "guild",

  guildCondition: async (guildId) => {
    return new Promise((resolve) => {
      db.get(
        "SELECT enabled, daily_enabled FROM economy_config WHERE guild_id = ?",
        [guildId],
        (err, row) => {
          if (err) return resolve(false);
          resolve(!!row?.enabled && !!row?.daily_enabled);
        }
      );
    });
  },

  slashOptions: [],

  executePrefix: async (client, message, args) => {
    await claimDaily(message.guild.id, message.author, (embed) => {
      message.reply({ embeds: [embed] });
    }, (errMsg) => {
      message.reply(errMsg);
    });
  },

  executeSlash: async (client, interaction) => {
    await claimDaily(interaction.guild.id, interaction.user, (embed) => {
      interaction.reply({ embeds: [embed] });
    }, (errMsg) => {
      interaction.reply({ content: errMsg, ephemeral: true });
    });
  },
});

async function claimDaily(guildId, user, onSuccess, onError) {
  db.get(
    "SELECT currency_name, currency_symbol, daily_amount, daily_cooldown_hours FROM economy_config WHERE guild_id = ?",
    [guildId],
    (err, config) => {
      if (err || !config) {
        return onError("Le système d'économie n'est pas configuré.");
      }

      db.get(
        "SELECT balance, last_daily_timestamp FROM user_economy WHERE guild_id = ? AND user_id = ?",
        [guildId, user.id],
        (err, row) => {
          if (err) return onError("Erreur lors de la récupération des données.");

          const now = Date.now();
          const cooldownMs = config.daily_cooldown_hours * 60 * 60 * 1000;
          const lastDaily = row?.last_daily_timestamp || 0;

          if (now - lastDaily < cooldownMs) {
            const timeLeft = cooldownMs - (now - lastDaily);
            const hours = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
            return onError(`⏰ Vous devez attendre encore **${hours}h ${minutes}m** avant de récupérer votre récompense quotidienne.`);
          }

          const newBalance = (row?.balance || 0) + config.daily_amount;

          db.run(
            `INSERT INTO user_economy (guild_id, user_id, balance, bank, last_daily_timestamp)
             VALUES (?, ?, ?, 0, ?)
             ON CONFLICT(guild_id, user_id) DO UPDATE SET
               balance = ?,
               last_daily_timestamp = ?`,
            [guildId, user.id, newBalance, now, newBalance, now],
            (err) => {
              if (err) return onError("Erreur lors de la sauvegarde.");

              const embed = new EmbedBuilder()
                .setTitle(`${config.currency_symbol} Récompense quotidienne`)
                .setColor("#00FF00")
                .setDescription(`Vous avez récupéré **${config.daily_amount.toLocaleString()} ${config.currency_name}** !\n\nNouveau solde : **${newBalance.toLocaleString()} ${config.currency_name}**`)
                .setTimestamp();

              onSuccess(embed);
            }
          );
        }
      );
    }
  );
}
