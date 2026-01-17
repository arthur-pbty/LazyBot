const addCommand = require("../fonctions/addCommand");
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = addCommand({
  name: "ban",
  description: "Bannit un membre du serveur.",
  aliases: ["bannir"],
  permissions: [PermissionFlagsBits.BanMembers],
  botOwnerOnly: false,
  dm: false,
  scope: "global",

  slashOptions: [
    {
      type: "USER",
      name: "utilisateur",
      description: "L'utilisateur à bannir",
      required: true,
    },
    {
      type: "STRING",
      name: "raison",
      description: "La raison du bannissement",
      required: false,
    },
    {
      type: "INTEGER",
      name: "supprimer_messages",
      description: "Nombre de jours de messages à supprimer (0-7)",
      required: false,
    },
  ],

  executePrefix: async (client, message, args) => {
    const user = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!user) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription("❌ Veuillez mentionner un utilisateur à bannir.")] });
    }

    const reason = args.slice(1).join(" ") || "Aucune raison fournie";
    const member = message.guild.members.cache.get(user.id);

    const error = validateBan(member, message.member, message.guild, user);
    if (error) return message.reply({ embeds: [error] });

    await executeBan(user, reason, 0, message.author, message.guild, message, member);
  },

  executeSlash: async (client, interaction) => {
    const user = interaction.options.getUser("utilisateur");
    const reason = interaction.options.getString("raison") || "Aucune raison fournie";
    const deleteMessageDays = interaction.options.getInteger("supprimer_messages") || 0;
    const member = interaction.guild.members.cache.get(user.id);

    const error = validateBan(member, interaction.member, interaction.guild, user);
    if (error) return interaction.reply({ embeds: [error], ephemeral: true });

    await executeBan(user, reason, deleteMessageDays, interaction.user, interaction.guild, interaction, member);
  },
});

function validateBan(member, executor, guild, user) {
  if (user.id === executor.id) {
    return new EmbedBuilder().setColor(0xED4245).setDescription("❌ Vous ne pouvez pas vous bannir vous-même.");
  }
  if (user.id === guild.ownerId) {
    return new EmbedBuilder().setColor(0xED4245).setDescription("❌ Vous ne pouvez pas bannir le propriétaire du serveur.");
  }
  if (member) {
    if (!member.bannable) {
      return new EmbedBuilder().setColor(0xED4245).setDescription("❌ Je ne peux pas bannir cet utilisateur. Vérifiez que mon rôle est au-dessus du sien.");
    }
    if (executor.roles.highest.position <= member.roles.highest.position && executor.id !== guild.ownerId) {
      return new EmbedBuilder().setColor(0xED4245).setDescription("❌ Vous ne pouvez pas bannir quelqu'un avec un rôle égal ou supérieur au vôtre.");
    }
  }
  return null;
}

async function executeBan(user, reason, deleteMessageDays, moderator, guild, context, member) {
  try {
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`🔨 Vous avez été banni de ${guild.name}`)
        .addFields(
          { name: "📋 Raison", value: reason },
          { name: "👮 Modérateur", value: moderator.tag }
        )
        .setTimestamp();
      await user.send({ embeds: [dmEmbed] });
    } catch (e) {}

    await guild.members.ban(user, {
      reason: `${reason} | Par ${moderator.tag}`,
      deleteMessageSeconds: Math.min(Math.max(deleteMessageDays, 0), 7) * 24 * 60 * 60
    });

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("🔨 Membre banni")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "👤 Utilisateur", value: `${user.tag} (${user.id})`, inline: true },
        { name: "👮 Modérateur", value: moderator.tag, inline: true },
        { name: "📋 Raison", value: reason, inline: false },
        { name: "🗑️ Messages supprimés", value: `${deleteMessageDays} jour(s)`, inline: true }
      )
      .setFooter({ text: `Banni par ${moderator.username}`, iconURL: moderator.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    await context.reply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    const errorEmbed = new EmbedBuilder().setColor(0xED4245).setDescription("❌ Une erreur est survenue lors du bannissement.");
    await context.reply({ embeds: [errorEmbed], ephemeral: true });
  }
}
