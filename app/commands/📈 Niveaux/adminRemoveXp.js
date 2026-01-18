const addCommand = require("../../fonctions/addCommand");
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../../db");

module.exports = addCommand({
  name: "adminremovexp",
  description: "Retire de l'XP ou des niveaux à un utilisateur (admin uniquement).",
  aliases: ["removexp", "takexp", "removelevel"],
  permissions: [PermissionFlagsBits.Administrator],
  botOwnerOnly: false,
  dm: false,
  scope: "guild",

  guildCondition: async (guildId) => {
    return new Promise((resolve) => {
      db.get(
        "SELECT enabled FROM levels_config WHERE guild_id = ?",
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
      description: "L'utilisateur à qui retirer l'XP ou les niveaux.",
      required: true,
    },
    {
      type: "STRING",
      name: "type",
      description: "Type de retrait : 'xp' ou 'level'.",
      required: true,
      choices: [
        { name: "XP", value: "xp" },
        { name: "Niveau", value: "level" },
      ],
    },
    {
      type: "INTEGER",
      name: "quantite",
      description: "Quantité d'XP ou de niveaux à retirer.",
      required: true,
    },
  ],

  executePrefix: async (client, message, args) => {
    const guildId = message.guild.id;

    // Vérifier les arguments : !adminremovexp @user xp/level quantité
    if (args.length < 3) {
      return message.reply("Usage : `!adminremovexp @utilisateur <xp|level> <quantité>`");
    }

    const userMention = message.mentions.users.first();
    if (!userMention) {
      return message.reply("Veuillez mentionner un utilisateur valide.");
    }

    const type = args[1].toLowerCase();
    if (type !== "xp" && type !== "level") {
      return message.reply("Le type doit être `xp` ou `level`.");
    }

    const quantite = parseInt(args[2], 10);
    if (isNaN(quantite) || quantite <= 0) {
      return message.reply("La quantité doit être un nombre positif.");
    }

    await processRemoveXp(guildId, userMention.id, type, quantite, (embed) => {
      message.reply({ embeds: [embed] });
    }, (errMsg) => {
      message.reply(errMsg);
    });
  },

  executeSlash: async (client, interaction) => {
    const guildId = interaction.guild.id;

    const user = interaction.options.getUser("utilisateur");
    const type = interaction.options.getString("type");
    const quantite = interaction.options.getInteger("quantite");

    if (quantite <= 0) {
      return interaction.reply({ content: "La quantité doit être un nombre positif.", ephemeral: true });
    }

    await processRemoveXp(guildId, user.id, type, quantite, (embed) => {
      interaction.reply({ embeds: [embed] });
    }, (errMsg) => {
      interaction.reply({ content: errMsg, ephemeral: true });
    });
  },
});

async function processRemoveXp(guildId, userId, type, quantite, onSuccess, onError) {
  // Récupérer la config des niveaux
  db.get(
    `SELECT 
      xp_courbe_type,
      multiplier_courbe_for_level
    FROM levels_config WHERE guild_id = ?`,
    [guildId],
    (err, config) => {
      if (err || !config) {
        return onError("Le système de niveaux n'est pas configuré sur ce serveur.");
      }

      // Récupérer les données actuelles de l'utilisateur
      db.get(
        `SELECT xp, level FROM user_levels WHERE guild_id = ? AND user_id = ?`,
        [guildId, userId],
        (err, userRow) => {
          if (err) {
            return onError("Erreur lors de la récupération des données de l'utilisateur.");
          }

          if (!userRow) {
            return onError("Cet utilisateur n'a pas encore de données de niveau.");
          }

          let currentXp = userRow.xp;
          let currentLevel = userRow.level;

          // Fonction de courbe
          const multiplier = config.multiplier_courbe_for_level;
          let fonction_courbe;

          if (config.xp_courbe_type === "constante") {
            fonction_courbe = (level) => multiplier;
          } else if (config.xp_courbe_type === "linear") {
            fonction_courbe = (level) => level * multiplier;
          } else if (config.xp_courbe_type === "quadratic") {
            fonction_courbe = (level) => level * level * multiplier;
          } else if (config.xp_courbe_type === "exponential") {
            fonction_courbe = (level) => Math.pow(2, level - 1) * multiplier;
          }

          let newXp = currentXp;
          let newLevel = currentLevel;

          if (type === "xp") {
            newXp -= quantite;
            // Gérer les niveaux en négatif
            while (newXp < 0 && newLevel > 1) {
              newLevel -= 1;
              newXp += fonction_courbe(newLevel);
            }
            // S'assurer que l'XP ne soit pas négatif
            if (newXp < 0) {
              newXp = 0;
            }
          } else if (type === "level") {
            // Retirer les niveaux directement
            newLevel -= quantite;
            if (newLevel < 1) {
              newLevel = 1;
            }
            newXp = 0; // Reset XP
          }

          // Sauvegarder en base
          db.run(
            `UPDATE user_levels SET xp = ?, level = ? WHERE guild_id = ? AND user_id = ?`,
            [newXp, newLevel, guildId, userId],
            (err) => {
              if (err) {
                return onError("Erreur lors de la sauvegarde des données.");
              }

              const embed = new EmbedBuilder()
                .setTitle("❌ XP/Niveau retiré")
                .setColor("#FF0000")
                .setDescription(
                  type === "xp"
                    ? `**${quantite} XP** retiré à <@${userId}>.\n\n` +
                      `**Niveau actuel :** ${newLevel}\n**XP actuel :** ${newXp}`
                    : `**${quantite} niveau(x)** retiré(s) à <@${userId}>.\n\n` +
                      `**Niveau actuel :** ${newLevel}\n**XP actuel :** ${newXp}`
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
