const addCommand = require("../fonctions/addCommand");
const { EmbedBuilder } = require("discord.js");
const db = require("../db");

const crimeSuccessMessages = [
  "Vous avez cambriolé une maison et volé",
  "Vous avez piraté un distributeur et récupéré",
  "Vous avez arnaqué quelqu'un et obtenu",
  "Vous avez trouvé un portefeuille abandonné contenant",
  "Vous avez vendu des objets volés pour",
  "Vous avez braqué une épicerie et pris",
  "Vous avez piraté un compte bancaire et transféré"
];

const crimeFailMessages = [
  "Vous vous êtes fait attraper par la police !",
  "Un témoin vous a dénoncé !",
  "Les caméras de surveillance vous ont repéré !",
  "Vous avez glissé sur une peau de banane en fuyant !",
  "Un chien de garde vous a mordu !",
  "Vous avez déclenché l'alarme !",
  "La victime connaissait du karaté !"
];

module.exports = addCommand({
  name: "crime",
  description: "Tentez un crime risqué pour de l'argent.",
  aliases: ["vol", "steal", "rob"],
  permissions: [],
  botOwnerOnly: false,
  dm: false,
  scope: "guild",

  guildCondition: async (guildId) => {
    return new Promise((resolve) => {
      db.get(
        "SELECT enabled, crime_enabled FROM economy_config WHERE guild_id = ?",
        [guildId],
        (err, row) => {
          if (err) return resolve(false);
          resolve(!!row?.enabled && !!row?.crime_enabled);
        }
      );
    });
  },

  slashOptions: [],

  executePrefix: async (client, message, args) => {
    await doCrime(message.guild.id, message.author, (embed) => {
      message.reply({ embeds: [embed] });
    }, (errMsg) => {
      message.reply(errMsg);
    });
  },

  executeSlash: async (client, interaction) => {
    await doCrime(interaction.guild.id, interaction.user, (embed) => {
      interaction.reply({ embeds: [embed] });
    }, (errMsg) => {
      interaction.reply({ content: errMsg, ephemeral: true });
    });
  },
});

async function doCrime(guildId, user, onSuccess, onError) {
  db.get(
    `SELECT currency_name, currency_symbol, crime_min_amount, crime_max_amount, 
            crime_success_rate, crime_fine_percent, crime_cooldown_minutes 
     FROM economy_config WHERE guild_id = ?`,
    [guildId],
    (err, config) => {
      if (err || !config) {
        return onError("Le système d'économie n'est pas configuré.");
      }

      db.get(
        "SELECT balance, last_crime_timestamp FROM user_economy WHERE guild_id = ? AND user_id = ?",
        [guildId, user.id],
        (err, row) => {
          if (err) return onError("Erreur lors de la récupération des données.");

          const now = Date.now();
          const cooldownMs = config.crime_cooldown_minutes * 60 * 1000;
          const lastCrime = row?.last_crime_timestamp || 0;

          if (now - lastCrime < cooldownMs) {
            const timeLeft = cooldownMs - (now - lastCrime);
            const minutes = Math.floor(timeLeft / (60 * 1000));
            const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
            return onError(`⏰ Vous devez attendre encore **${minutes}m ${seconds}s** avant de pouvoir commettre un autre crime.`);
          }

          const currentBalance = row?.balance || 0;
          const success = Math.random() * 100 < config.crime_success_rate;

          let newBalance;
          let embed;

          if (success) {
            const earned = Math.floor(Math.random() * (config.crime_max_amount - config.crime_min_amount + 1)) + config.crime_min_amount;
            newBalance = currentBalance + earned;
            const crimeMsg = crimeSuccessMessages[Math.floor(Math.random() * crimeSuccessMessages.length)];

            embed = new EmbedBuilder()
              .setTitle(`${config.currency_symbol} Crime réussi !`)
              .setColor("#00FF00")
              .setDescription(`${crimeMsg} **${earned.toLocaleString()} ${config.currency_name}** !`)
              .setTimestamp();
          } else {
            const fine = Math.floor(currentBalance * (config.crime_fine_percent / 100));
            newBalance = Math.max(0, currentBalance - fine);
            const failMsg = crimeFailMessages[Math.floor(Math.random() * crimeFailMessages.length)];

            embed = new EmbedBuilder()
              .setTitle("🚔 Crime échoué !")
              .setColor("#FF0000")
              .setDescription(`${failMsg}\n\nVous avez payé une amende de **${fine.toLocaleString()} ${config.currency_name}**.`)
              .setTimestamp();
          }

          db.run(
            `INSERT INTO user_economy (guild_id, user_id, balance, bank, last_crime_timestamp)
             VALUES (?, ?, ?, 0, ?)
             ON CONFLICT(guild_id, user_id) DO UPDATE SET
               balance = ?,
               last_crime_timestamp = ?`,
            [guildId, user.id, newBalance, now, newBalance, now],
            (err) => {
              if (err) return onError("Erreur lors de la sauvegarde.");
              onSuccess(embed);
            }
          );
        }
      );
    }
  );
}
