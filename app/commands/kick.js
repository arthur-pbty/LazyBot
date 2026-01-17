const addCommand = require("../fonctions/addCommand");
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = addCommand({
  name: "kick",
  description: "Expulse un membre du serveur.",
  aliases: ["expulser"],
  permissions: [PermissionFlagsBits.KickMembers],
  botOwnerOnly: false,
  dm: false,
  scope: "global",

  slashOptions: [
    {
      type: "USER",
      name: "utilisateur",
      description: "L'utilisateur à expulser",
      required: true,
    },
    {
      type: "STRING",
      name: "raison",
      description: "La raison de l'expulsion",
      required: false,
    },
  ],

  executePrefix: async (client, message, args) => {
    const user = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!user) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription("❌ Veuillez mentionner un utilisateur à expulser.")] });
    }

    const reason = args.slice(1).join(" ") || "Aucune raison fournie";
    const member = message.guild.members.cache.get(user.id);

    const error = validateKick(member, message.member, message.guild, user);
    if (error) return message.reply({ embeds: [error] });

    await executeKick(member, user, reason, message.author, message.guild, message);
  },

  executeSlash: async (client, interaction) => {
    const user = interaction.options.getUser("utilisateur");
    const reason = interaction.options.getString("raison") || "Aucune raison fournie";
    const member = interaction.guild.members.cache.get(user.id);

    const error = validateKick(member, interaction.member, interaction.guild, user);
    if (error) return interaction.reply({ embeds: [error], ephemeral: true });

    await executeKick(member, user, reason, interaction.user, interaction.guild, interaction);
  },
});

function validateKick(member, executor, guild, user) {
  if (!member) {
    return new EmbedBuilder().setColor(0xED4245).setDescription("❌ Cet utilisateur n'est pas sur ce serveur.");
  }
  if (member.id === executor.id) {
    return new EmbedBuilder().setColor(0xED4245).setDescription("❌ Vous ne pouvez pas vous expulser vous-même.");
  }
  if (member.id === guild.ownerId) {
    return new EmbedBuilder().setColor(0xED4245).setDescription("❌ Vous ne pouvez pas expulser le propriétaire du serveur.");
  }
  if (!member.kickable) {
    return new EmbedBuilder().setColor(0xED4245).setDescription("❌ Je ne peux pas expulser cet utilisateur. Vérifiez que mon rôle est au-dessus du sien.");
  }
  if (executor.roles.highest.position <= member.roles.highest.position && executor.id !== guild.ownerId) {
    return new EmbedBuilder().setColor(0xED4245).setDescription("❌ Vous ne pouvez pas expulser quelqu'un avec un rôle égal ou supérieur au vôtre.");
  }
  return null;
}

async function executeKick(member, user, reason, moderator, guild, context) {
  try {
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`🚪 Vous avez été expulsé de ${guild.name}`)
        .addFields(
          { name: "📋 Raison", value: reason },
          { name: "👮 Modérateur", value: moderator.tag }
        )
        .setTimestamp();
      await user.send({ embeds: [dmEmbed] });
    } catch (e) {}

    await member.kick(reason);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle("🚪 Membre expulsé")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "👤 Utilisateur", value: `${user.tag} (${user.id})`, inline: true },
        { name: "👮 Modérateur", value: moderator.tag, inline: true },
        { name: "📋 Raison", value: reason, inline: false }
      )
      .setFooter({ text: `Expulsé par ${moderator.username}`, iconURL: moderator.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    await context.reply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    const errorEmbed = new EmbedBuilder().setColor(0xED4245).setDescription("❌ Une erreur est survenue lors de l'expulsion.");
    await context.reply({ embeds: [errorEmbed], ephemeral: true });
  }
}
