const addCommand = require("../fonctions/addCommand");
const { EmbedBuilder } = require("discord.js");
const db = require("../db");

const workMessages = [
  "Vous avez travaillé comme serveur et gagné",
  "Vous avez tondu des pelouses et gagné",
  "Vous avez livré des pizzas et gagné",
  "Vous avez aidé un voisin à déménager et gagné",
  "Vous avez fait du baby-sitting et gagné",
  "Vous avez lavé des voitures et gagné",
  "Vous avez promené des chiens et gagné",
  "Vous avez vendu des limonades et gagné",
  "Vous avez travaillé comme caissier et gagné",
  "Vous avez donné des cours particuliers et gagné",
  "Vous avez réparé des ordinateurs et gagné",
  "Vous avez fait du jardinage et gagné"
];

module.exports = addCommand({
  name: "work",
  description: "Travaillez pour gagner de l'argent.",
  aliases: ["travail", "travailler", "job"],
  permissions: [],
  botOwnerOnly: false,
  dm: false,
  scope: "guild",

  guildCondition: async (guildId) => {
    return new Promise((resolve) => {
      db.get(
        "SELECT enabled, work_enabled FROM economy_config WHERE guild_id = ?",
        [guildId],
        (err, row) => {
          if (err) return resolve(false);
          resolve(!!row?.enabled && !!row?.work_enabled);
        }
      );
    });
  },

  slashOptions: [],

  executePrefix: async (client, message, args) => {
    await doWork(message.guild.id, message.author, (embed) => {
      message.reply({ embeds: [embed] });
    }, (errMsg) => {
      message.reply(errMsg);
    });
  },

  executeSlash: async (client, interaction) => {
    await doWork(interaction.guild.id, interaction.user, (embed) => {
      interaction.reply({ embeds: [embed] });
    }, (errMsg) => {
      interaction.reply({ content: errMsg, ephemeral: true });
    });
  },
});

async function doWork(guildId, user, onSuccess, onError) {
  db.get(
    "SELECT currency_name, currency_symbol, work_min_amount, work_max_amount, work_cooldown_minutes FROM economy_config WHERE guild_id = ?",
    [guildId],
    (err, config) => {
      if (err || !config) {
        return onError("Le système d'économie n'est pas configuré.");
      }

      db.get(
        "SELECT balance, last_work_timestamp FROM user_economy WHERE guild_id = ? AND user_id = ?",
        [guildId, user.id],
        (err, row) => {
          if (err) return onError("Erreur lors de la récupération des données.");

          const now = Date.now();
          const cooldownMs = config.work_cooldown_minutes * 60 * 1000;
          const lastWork = row?.last_work_timestamp || 0;

          if (now - lastWork < cooldownMs) {
            const timeLeft = cooldownMs - (now - lastWork);
            const minutes = Math.floor(timeLeft / (60 * 1000));
            const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
            return onError(`⏰ Vous devez attendre encore **${minutes}m ${seconds}s** avant de pouvoir retravailler.`);
          }

          const earned = Math.floor(Math.random() * (config.work_max_amount - config.work_min_amount + 1)) + config.work_min_amount;
          const newBalance = (row?.balance || 0) + earned;
          const workMsg = workMessages[Math.floor(Math.random() * workMessages.length)];

          db.run(
            `INSERT INTO user_economy (guild_id, user_id, balance, bank, last_work_timestamp)
             VALUES (?, ?, ?, 0, ?)
             ON CONFLICT(guild_id, user_id) DO UPDATE SET
               balance = ?,
               last_work_timestamp = ?`,
            [guildId, user.id, newBalance, now, newBalance, now],
            (err) => {
              if (err) return onError("Erreur lors de la sauvegarde.");

              const embed = new EmbedBuilder()
                .setTitle(`${config.currency_symbol} Travail`)
                .setColor("#00FF00")
                .setDescription(`${workMsg} **${earned.toLocaleString()} ${config.currency_name}** !`)
                .setTimestamp();

              onSuccess(embed);
            }
          );
        }
      );
    }
  );
}
