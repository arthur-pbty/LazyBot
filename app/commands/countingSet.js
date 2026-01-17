const addCommand = require("../fonctions/addCommand");
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../db");

module.exports = addCommand({
  name: "counting-set",
  description: "Définit le compteur à une valeur spécifique.",
  aliases: ["countset", "setcount"],
  permissions: [PermissionFlagsBits.ManageGuild],
  botOwnerOnly: false,
  dm: false,
  scope: "guild",

  guildCondition: async (guildId) => {
    return new Promise((resolve) => {
      db.get(
        "SELECT enabled FROM counting_config WHERE guild_id = ?",
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
      type: "INTEGER",
      name: "nombre",
      description: "La nouvelle valeur du compteur",
      required: true,
    },
  ],

  executePrefix: async (client, message, args) => {
    const number = parseInt(args[0], 10);
    if (isNaN(number) || number < 0) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription("❌ Veuillez spécifier un nombre valide (>= 0).")]
      });
    }

    await setCount(message.guild, number, message.author, message);
  },

  executeSlash: async (client, interaction) => {
    const number = interaction.options.getInteger("nombre");
    if (number < 0) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription("❌ Le nombre doit être supérieur ou égal à 0.")],
        ephemeral: true
      });
    }

    await setCount(interaction.guild, number, interaction.user, interaction);
  },
});

async function setCount(guild, number, moderator, context) {
  try {
    const config = await db.getAsync(
      "SELECT enabled, channel_id FROM counting_config WHERE guild_id = ?",
      [guild.id]
    );

    if (!config || !config.enabled) {
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription("❌ Le système de comptage n'est pas activé sur ce serveur.");
      return context.reply({ embeds: [embed], ephemeral: true });
    }

    // Mettre à jour le compteur
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE counting_config SET current_count = ?, last_user_id = NULL WHERE guild_id = ?",
        [number, guild.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle("🔢 Compteur modifié")
      .setDescription(`Le compteur a été défini à **${number}**.`)
      .addFields(
        { name: "👮 Modérateur", value: moderator.tag, inline: true },
        { name: "➡️ Prochain nombre", value: `${number + 1}`, inline: true }
      )
      .setFooter({ text: `Modifié par ${moderator.username}`, iconURL: moderator.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    await context.reply({ embeds: [embed] });

    // Envoyer un message dans le salon de comptage
    if (config.channel_id) {
      const channel = guild.channels.cache.get(config.channel_id);
      if (channel) {
        const announceEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setDescription(`🔢 Le compteur a été défini à **${number}** par un administrateur.\n\n➡️ Le prochain nombre est **${number + 1}**`);
        
        await channel.send({ embeds: [announceEmbed] });
      }
    }
  } catch (error) {
    console.error(error);
    const errorEmbed = new EmbedBuilder().setColor(0xED4245).setDescription("❌ Une erreur est survenue.");
    await context.reply({ embeds: [errorEmbed], ephemeral: true });
  }
}
