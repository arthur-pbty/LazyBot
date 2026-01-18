const addCommand = require("../../fonctions/addCommand");
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = addCommand({
  name: "untimeout",
  description: "Retire le timeout d'un membre.",
  aliases: ["unmute", "uto"],
  permissions: [PermissionFlagsBits.ModerateMembers],
  botOwnerOnly: false,
  dm: false,
  scope: "global",

  slashOptions: [
    {
      type: "USER",
      name: "utilisateur",
      description: "L'utilisateur dont vous voulez retirer le timeout",
      required: true,
    },
    {
      type: "STRING",
      name: "raison",
      description: "La raison du retrait du timeout",
      required: false,
    },
  ],

  executePrefix: async (client, message, args) => {
    const user = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!user) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription("❌ Veuillez mentionner un utilisateur.")] });
    }

    const reason = args.slice(1).join(" ") || "Aucune raison fournie";
    const member = message.guild.members.cache.get(user.id);

    await executeUntimeout(member, user, reason, message.author, message.guild, message);
  },

  executeSlash: async (client, interaction) => {
    const user = interaction.options.getUser("utilisateur");
    const reason = interaction.options.getString("raison") || "Aucune raison fournie";
    const member = interaction.guild.members.cache.get(user.id);

    await executeUntimeout(member, user, reason, interaction.user, interaction.guild, interaction);
  },
});

async function executeUntimeout(member, user, reason, moderator, guild, context) {
  const sendError = async (msg) => {
    const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
    await context.reply({ embeds: [embed], ephemeral: true });
  };

  if (!member) {
    return sendError("❌ Cet utilisateur n'est pas sur ce serveur.");
  }

  if (!member.isCommunicationDisabled()) {
    return sendError("❌ Cet utilisateur n'est pas en timeout.");
  }

  if (!member.moderatable) {
    return sendError("❌ Je ne peux pas modifier le timeout de cet utilisateur.");
  }

  try {
    await member.timeout(null, `${reason} | Par ${moderator.tag}`);

    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`✅ Votre timeout a été retiré sur ${guild.name}`)
        .addFields(
          { name: "📋 Raison", value: reason },
          { name: "👮 Modérateur", value: moderator.tag }
        )
        .setTimestamp();
      await user.send({ embeds: [dmEmbed] });
    } catch (e) {}

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle("✅ Timeout retiré")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "👤 Utilisateur", value: `${user.tag} (${user.id})`, inline: true },
        { name: "👮 Modérateur", value: moderator.tag, inline: true },
        { name: "📋 Raison", value: reason, inline: false }
      )
      .setFooter({ text: `Untimeout par ${moderator.username}`, iconURL: moderator.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    await context.reply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    const errorEmbed = new EmbedBuilder().setColor(0xED4245).setDescription("❌ Une erreur est survenue lors du retrait du timeout.");
    await context.reply({ embeds: [errorEmbed], ephemeral: true });
  }
}
