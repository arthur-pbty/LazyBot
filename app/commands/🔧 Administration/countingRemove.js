const addCommand = require("../../fonctions/addCommand");
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../../db");

module.exports = addCommand({
  name: "counting-remove",
  description: "Retire un nombre du compteur actuel.",
  aliases: ["countremove", "removecount"],
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
      description: "Le nombre à retirer du compteur",
      required: true,
    },
  ],

  executePrefix: async (client, message, args) => {
    const number = parseInt(args[0], 10);
    if (isNaN(number) || number <= 0) {
      return message.reply({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription("❌ Veuillez spécifier un nombre valide (> 0).")]
      });
    }

    await removeCount(message.guild, number, message.author, message);
  },

  executeSlash: async (client, interaction) => {
    const number = interaction.options.getInteger("nombre");
    if (number <= 0) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription("❌ Le nombre doit être supérieur à 0.")],
        ephemeral: true
      });
    }

    await removeCount(interaction.guild, number, interaction.user, interaction);
  },
});

async function removeCount(guild, amount, moderator, context) {
  try {
    const config = await db.getAsync(
      "SELECT enabled, channel_id, current_count FROM counting_config WHERE guild_id = ?",
      [guild.id]
    );

    if (!config || !config.enabled) {
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription("❌ Le système de comptage n'est pas activé sur ce serveur.");
      return context.reply({ embeds: [embed], ephemeral: true });
    }

    const oldCount = config.current_count || 0;
    const newCount = Math.max(0, oldCount - amount); // Ne pas aller en dessous de 0

    // Mettre à jour le compteur
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE counting_config SET current_count = ?, last_user_id = NULL WHERE guild_id = ?",
        [newCount, guild.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle("🔢 Compteur diminué")
      .setDescription(`**-${amount}** retiré du compteur !`)
      .addFields(
        { name: "📊 Ancien", value: `${oldCount}`, inline: true },
        { name: "📊 Nouveau", value: `${newCount}`, inline: true },
        { name: "➡️ Prochain", value: `${newCount + 1}`, inline: true }
      )
      .setFooter({ text: `Modifié par ${moderator.username}`, iconURL: moderator.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    await context.reply({ embeds: [embed] });

    // Envoyer un message dans le salon de comptage
    if (config.channel_id) {
      const channel = guild.channels.cache.get(config.channel_id);
      if (channel) {
        const announceEmbed = new EmbedBuilder()
          .setColor(0xFEE75C)
          .setDescription(`🔢 Un administrateur a retiré **-${amount}** du compteur !\n\n📊 Compteur actuel : **${newCount}**\n➡️ Le prochain nombre est **${newCount + 1}**`);
        
        await channel.send({ embeds: [announceEmbed] });
      }
    }
  } catch (error) {
    console.error(error);
    const errorEmbed = new EmbedBuilder().setColor(0xED4245).setDescription("❌ Une erreur est survenue.");
    await context.reply({ embeds: [errorEmbed], ephemeral: true });
  }
}
