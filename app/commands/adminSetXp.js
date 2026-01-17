const addCommand = require("../fonctions/addCommand");
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../db");

module.exports = addCommand({
  name: "adminsetxp",
  description: "Définit l'XP ou le niveau d'un utilisateur (admin uniquement).",
  aliases: ["setxp", "setlevel"],
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
      description: "L'utilisateur dont définir l'XP ou le niveau.",
      required: true,
    },
    {
      type: "STRING",
      name: "type",
      description: "Ce que vous voulez définir : 'xp' ou 'level'.",
      required: true,
      choices: [
        { name: "XP", value: "xp" },
        { name: "Niveau", value: "level" },
      ],
    },
    {
      type: "INTEGER",
      name: "valeur",
      description: "La nouvelle valeur d'XP ou de niveau.",
      required: true,
    },
  ],

  executePrefix: async (client, message, args) => {
    const guildId = message.guild.id;

    // Vérifier les arguments : !adminsetxp @user xp/level valeur
    if (args.length < 3) {
      return message.reply("Usage : `!adminsetxp @utilisateur <xp|level> <valeur>`");
    }

    const userMention = message.mentions.users.first();
    if (!userMention) {
      return message.reply("Veuillez mentionner un utilisateur valide.");
    }

    const type = args[1].toLowerCase();
    if (type !== "xp" && type !== "level") {
      return message.reply("Le type doit être `xp` ou `level`.");
    }

    const valeur = parseInt(args[2], 10);
    if (isNaN(valeur) || valeur < 0) {
      return message.reply("La valeur doit être un nombre positif ou zéro.");
    }

    await processSetXp(guildId, userMention.id, type, valeur, (embed) => {
      message.reply({ embeds: [embed] });
    }, (errMsg) => {
      message.reply(errMsg);
    });
  },

  executeSlash: async (client, interaction) => {
    const guildId = interaction.guild.id;

    const user = interaction.options.getUser("utilisateur");
    const type = interaction.options.getString("type");
    const valeur = interaction.options.getInteger("valeur");

    if (valeur < 0) {
      return interaction.reply({ content: "La valeur doit être un nombre positif ou zéro.", ephemeral: true });
    }

    await processSetXp(guildId, user.id, type, valeur, (embed) => {
      interaction.reply({ embeds: [embed] });
    }, (errMsg) => {
      interaction.reply({ content: errMsg, ephemeral: true });
    });
  },
});

async function processSetXp(guildId, userId, type, valeur, onSuccess, onError) {
  // Récupérer la config des niveaux
  db.get(
    `SELECT 
      xp_courbe_type,
      multiplier_courbe_for_level,
      level_max
    FROM levels_config WHERE guild_id = ?`,
    [guildId],
    (err, config) => {
      if (err || !config) {
        return onError("Le système de niveaux n'est pas configuré sur ce serveur.");
      }

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

      let newXp, newLevel;

      if (type === "xp") {
        // Définir l'XP et recalculer le niveau
        newXp = valeur;
        newLevel = 1;

        let xpForNextLevel = fonction_courbe(newLevel);
        while (newXp >= xpForNextLevel && (config.level_max === 0 || newLevel < config.level_max)) {
          newXp -= xpForNextLevel;
          newLevel += 1;
          xpForNextLevel = fonction_courbe(newLevel);
        }
      } else if (type === "level") {
        // Définir le niveau directement
        newLevel = valeur;
        if (newLevel < 1) {
          newLevel = 1;
        }
        if (config.level_max > 0 && newLevel > config.level_max) {
          newLevel = config.level_max;
        }
        newXp = 0; // Reset XP au début du niveau
      }

      // Sauvegarder en base (INSERT ou UPDATE)
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
            .setTitle("⚙️ XP/Niveau défini")
            .setColor("#0099FF")
            .setDescription(
              type === "xp"
                ? `L'XP de <@${userId}> a été défini.\n\n` +
                  `**Niveau actuel :** ${newLevel}\n**XP actuel :** ${newXp}`
                : `Le niveau de <@${userId}> a été défini à **${newLevel}**.\n\n` +
                  `**XP actuel :** ${newXp}`
            )
            .setTimestamp();

          onSuccess(embed);
        }
      );
    }
  );
}
