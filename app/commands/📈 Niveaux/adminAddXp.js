const addCommand = require("../../fonctions/addCommand");
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../../db");

module.exports = addCommand({
  name: "adminaddxp",
  description: "Ajoute de l'XP ou des niveaux à un utilisateur (admin uniquement).",
  aliases: ["addxp", "givexp", "addlevel"],
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
      description: "L'utilisateur à qui ajouter l'XP ou les niveaux.",
      required: true,
    },
    {
      type: "STRING",
      name: "type",
      description: "Type d'ajout : 'xp' ou 'level'.",
      required: true,
      choices: [
        { name: "XP", value: "xp" },
        { name: "Niveau", value: "level" },
      ],
    },
    {
      type: "INTEGER",
      name: "quantite",
      description: "Quantité d'XP ou de niveaux à ajouter.",
      required: true,
    },
  ],

  executePrefix: async (client, message, args) => {
    const guildId = message.guild.id;

    // Vérifier les arguments : !adminaddxp @user xp/level quantité
    if (args.length < 3) {
      return message.reply("Usage : `!adminaddxp @utilisateur <xp|level> <quantité>`");
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

    await processAddXp(guildId, userMention.id, type, quantite, message.guild, (embed) => {
      message.reply({ embeds: [embed] });
    }, (errMsg) => {
      message.reply(errMsg);
    });
  },

  executeSlash: async (client, interaction) => {
    const guildId = interaction.guild.id;

    const user = interaction.options.getUser("utilisateur");
    const type = interaction.options.getString("type").toLowerCase();
    const quantite = interaction.options.getInteger("quantite");

    if (type !== "xp" && type !== "level") {
      return interaction.reply({ content: "Le type doit être `xp` ou `level`.", ephemeral: true });
    }

    if (quantite <= 0) {
      return interaction.reply({ content: "La quantité doit être un nombre positif.", ephemeral: true });
    }

    await processAddXp(guildId, user.id, type, quantite, interaction.guild, (embed) => {
      interaction.reply({ embeds: [embed] });
    }, (errMsg) => {
      interaction.reply({ content: errMsg, ephemeral: true });
    });
  },
});

async function processAddXp(guildId, userId, type, quantite, guild, onSuccess, onError) {
  // Récupérer la config des niveaux
  db.get(
    `SELECT 
      xp_courbe_type,
      multiplier_courbe_for_level,
      level_max,
      level_announcements_enabled,
      level_announcements_channel_id,
      level_announcements_message,
      level_annoncement_every_level
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

          let currentXp = userRow ? userRow.xp : 0;
          let currentLevel = userRow ? userRow.level : 1;

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
            newXp += quantite;
          } else if (type === "level") {
            // Ajouter les niveaux directement
            for (let i = 0; i < quantite; i++) {
              if (config.level_max === 0 || newLevel < config.level_max) {
                newLevel += 1;
              }
            }
            newXp = 0; // Reset XP au début du nouveau niveau
          }

          // Recalculer les niveaux si on a ajouté de l'XP
          if (type === "xp") {
            let xpForNextLevel = fonction_courbe(newLevel);
            while (newXp >= xpForNextLevel && (config.level_max === 0 || newLevel < config.level_max)) {
              newXp -= xpForNextLevel;
              newLevel += 1;
              xpForNextLevel = fonction_courbe(newLevel);

              // Annonce si activée
              if (config.level_announcements_enabled && (newLevel % config.level_annoncement_every_level === 0)) {
                const channel = guild.channels.cache.get(config.level_announcements_channel_id);
                if (channel) {
                  const member = guild.members.cache.get(userId);
                  let announcementMsg = config.level_announcements_message;
                  announcementMsg = announcementMsg
                    .replace("{user}", member?.user?.username || "Utilisateur")
                    .replace("{mention}", `<@${userId}>`)
                    .replace("{level}", newLevel)
                    .replace("{level-xp}", fonction_courbe(newLevel));
                  channel.send(announcementMsg);
                }
              }
            }
          }

          // Sauvegarder en base
          db.run(
            `INSERT INTO user_levels (guild_id, user_id, xp, level)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(guild_id, user_id) DO UPDATE SET
               xp = excluded.xp,
               level = excluded.level`,
            [guildId, userId, newXp, newLevel],
            (err) => {
              if (err) {
                return onError("Erreur lors de la sauvegarde des données.");
              }

              const embed = new EmbedBuilder()
                .setTitle("✅ XP/Niveau ajouté")
                .setColor("#00FF00")
                .setDescription(
                  type === "xp"
                    ? `**${quantite} XP** ajouté à <@${userId}>.\n\n` +
                      `**Niveau actuel :** ${newLevel}\n**XP actuel :** ${newXp}`
                    : `**${quantite} niveau(x)** ajouté(s) à <@${userId}>.\n\n` +
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