const addCommand = require("../fonctions/addCommand");
const { EmbedBuilder } = require("discord.js");
const db = require("../db");

const stealSuccessMessages = [
  "Vous avez subtilement volé",
  "Vous avez pickpocketé avec succès",
  "Vous avez dérobé discrètement",
  "Vous avez chapardé habilement",
  "Main dans la poche, vous avez pris"
];

const stealFailMessages = [
  "Vous vous êtes fait attraper la main dans le sac !",
  "La victime vous a surpris et a appelé la sécurité !",
  "Un passant a crié au voleur !",
  "Vous avez trébuché en tentant de fuir !",
  "La victime connaissait vos intentions !"
];

module.exports = addCommand({
  name: "steal",
  description: "Tentez de voler de l'argent à un autre utilisateur.",
  aliases: ["voler", "pickpocket"],
  permissions: [],
  botOwnerOnly: false,
  dm: false,
  scope: "guild",

  guildCondition: async (guildId) => {
    return new Promise((resolve) => {
      db.get(
        "SELECT enabled, steal_enabled FROM economy_config WHERE guild_id = ?",
        [guildId],
        (err, row) => {
          if (err) return resolve(false);
          resolve(!!row?.enabled && !!row?.steal_enabled);
        }
      );
    });
  },

  slashOptions: [
    {
      type: "USER",
      name: "cible",
      description: "L'utilisateur à voler.",
      required: true,
    },
  ],

  executePrefix: async (client, message, args) => {
    const targetUser = message.mentions.users.first();
    if (!targetUser) return message.reply("Veuillez mentionner un utilisateur à voler.");

    await doSteal(message.guild.id, message.author, targetUser, (embed) => {
      message.reply({ embeds: [embed] });
    }, (errMsg) => {
      message.reply(errMsg);
    });
  },

  executeSlash: async (client, interaction) => {
    const targetUser = interaction.options.getUser("cible");

    await doSteal(interaction.guild.id, interaction.user, targetUser, (embed) => {
      interaction.reply({ embeds: [embed] });
    }, (errMsg) => {
      interaction.reply({ content: errMsg, ephemeral: true });
    });
  },
});

async function doSteal(guildId, thief, victim, onSuccess, onError) {
  if (thief.id === victim.id) {
    return onError("Vous ne pouvez pas vous voler vous-même !");
  }

  if (victim.bot) {
    return onError("Vous ne pouvez pas voler un bot !");
  }

  db.get(
    `SELECT currency_name, currency_symbol, steal_success_rate, steal_max_percent, 
            steal_fine_percent, steal_cooldown_minutes 
     FROM economy_config WHERE guild_id = ?`,
    [guildId],
    (err, config) => {
      if (err || !config) {
        return onError("Le système d'économie n'est pas configuré.");
      }

      db.get(
        "SELECT balance, last_steal_timestamp FROM user_economy WHERE guild_id = ? AND user_id = ?",
        [guildId, thief.id],
        (err, thiefRow) => {
          if (err) return onError("Erreur lors de la récupération des données.");

          const now = Date.now();
          const cooldownMs = config.steal_cooldown_minutes * 60 * 1000;
          const lastSteal = thiefRow?.last_steal_timestamp || 0;

          if (now - lastSteal < cooldownMs) {
            const timeLeft = cooldownMs - (now - lastSteal);
            const minutes = Math.floor(timeLeft / (60 * 1000));
            const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
            return onError(`⏰ Vous devez attendre encore **${minutes}m ${seconds}s** avant de pouvoir voler quelqu'un.`);
          }

          // Get victim's wallet balance (not bank!)
          db.get(
            "SELECT balance FROM user_economy WHERE guild_id = ? AND user_id = ?",
            [guildId, victim.id],
            (err, victimRow) => {
              if (err) return onError("Erreur lors de la récupération des données.");

              const victimBalance = victimRow?.balance || 0;

              if (victimBalance <= 0) {
                return onError(`**${victim.username}** n'a pas d'argent dans son portefeuille à voler ! (L'argent en banque est protégé)`);
              }

              const thiefBalance = thiefRow?.balance || 0;
              const success = Math.random() * 100 < config.steal_success_rate;

              let embed;

              if (success) {
                // Calculate stolen amount (random % of victim's wallet, up to max_percent)
                const maxStealPercent = config.steal_max_percent / 100;
                const stealPercent = Math.random() * maxStealPercent;
                const stolenAmount = Math.max(1, Math.floor(victimBalance * stealPercent));

                const newThiefBalance = thiefBalance + stolenAmount;
                const newVictimBalance = victimBalance - stolenAmount;

                const stealMsg = stealSuccessMessages[Math.floor(Math.random() * stealSuccessMessages.length)];

                // Update thief
                db.run(
                  `INSERT INTO user_economy (guild_id, user_id, balance, bank, last_steal_timestamp)
                   VALUES (?, ?, ?, 0, ?)
                   ON CONFLICT(guild_id, user_id) DO UPDATE SET
                     balance = ?,
                     last_steal_timestamp = ?`,
                  [guildId, thief.id, newThiefBalance, now, newThiefBalance, now],
                  (err) => {
                    if (err) return onError("Erreur lors de la sauvegarde.");

                    // Update victim
                    db.run(
                      `UPDATE user_economy SET balance = ? WHERE guild_id = ? AND user_id = ?`,
                      [newVictimBalance, guildId, victim.id],
                      (err) => {
                        if (err) return onError("Erreur lors de la sauvegarde.");

                        embed = new EmbedBuilder()
                          .setTitle(`${config.currency_symbol} Vol réussi !`)
                          .setColor("#00FF00")
                          .setDescription(`${stealMsg} **${stolenAmount.toLocaleString()} ${config.currency_name}** à ${victim} !`)
                          .setTimestamp();

                        onSuccess(embed);
                      }
                    );
                  }
                );
              } else {
                // Failed - pay fine to victim
                const fine = Math.floor(thiefBalance * (config.steal_fine_percent / 100));
                const newThiefBalance = Math.max(0, thiefBalance - fine);
                const newVictimBalance = victimBalance + fine;

                const failMsg = stealFailMessages[Math.floor(Math.random() * stealFailMessages.length)];

                // Update thief
                db.run(
                  `INSERT INTO user_economy (guild_id, user_id, balance, bank, last_steal_timestamp)
                   VALUES (?, ?, ?, 0, ?)
                   ON CONFLICT(guild_id, user_id) DO UPDATE SET
                     balance = ?,
                     last_steal_timestamp = ?`,
                  [guildId, thief.id, newThiefBalance, now, newThiefBalance, now],
                  (err) => {
                    if (err) return onError("Erreur lors de la sauvegarde.");

                    // Give fine to victim
                    db.run(
                      `INSERT INTO user_economy (guild_id, user_id, balance, bank)
                       VALUES (?, ?, ?, 0)
                       ON CONFLICT(guild_id, user_id) DO UPDATE SET balance = ?`,
                      [guildId, victim.id, newVictimBalance, newVictimBalance],
                      (err) => {
                        if (err) return onError("Erreur lors de la sauvegarde.");

                        embed = new EmbedBuilder()
                          .setTitle("🚔 Vol échoué !")
                          .setColor("#FF0000")
                          .setDescription(`${failMsg}\n\nVous avez dû payer **${fine.toLocaleString()} ${config.currency_name}** à ${victim} en dédommagement.`)
                          .setTimestamp();

                        onSuccess(embed);
                      }
                    );
                  }
                );
              }
            }
          );
        }
      );
    }
  );
}
