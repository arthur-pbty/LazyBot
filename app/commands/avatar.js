const addCommand = require("../fonctions/addCommand");
const { EmbedBuilder } = require("discord.js");

module.exports = addCommand({
  name: "avatar",
  description: "Affiche l'avatar d'un utilisateur.",
  aliases: ["av", "pp", "pdp", "pfp"],
  permissions: [],
  botOwnerOnly: false,
  dm: false,
  scope: "global",

  slashOptions: [
    {
      type: "USER",
      name: "utilisateur",
      description: "L'utilisateur dont vous voulez voir l'avatar",
      required: false,
    },
  ],

  executePrefix: async (client, message, args) => {
    const user = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null) || message.author;
    const member = message.guild.members.cache.get(user.id);
    await sendAvatarEmbed(message, user, member, message.author);
  },

  executeSlash: async (client, interaction) => {
    const user = interaction.options.getUser("utilisateur") || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);
    await sendAvatarEmbedSlash(interaction, user, member);
  },
});

async function sendAvatarEmbed(message, user, member, requestedBy) {
  const globalAvatar = user.displayAvatarURL({ dynamic: true, size: 4096 });
  const serverAvatar = member?.displayAvatarURL({ dynamic: true, size: 4096 });

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🖼️ Avatar de ${user.username}`)
    .setImage(globalAvatar)
    .addFields(
      { name: "🔗 Liens", value: `[PNG](${user.displayAvatarURL({ extension: "png", size: 4096 })}) • [JPG](${user.displayAvatarURL({ extension: "jpg", size: 4096 })}) • [WEBP](${user.displayAvatarURL({ extension: "webp", size: 4096 })})${user.avatar?.startsWith("a_") ? ` • [GIF](${user.displayAvatarURL({ extension: "gif", size: 4096 })})` : ""}`, inline: false }
    )
    .setFooter({ text: `Demandé par ${requestedBy.username}`, iconURL: requestedBy.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();

  if (serverAvatar && serverAvatar !== globalAvatar) {
    embed.setDescription("**Avatar global** (avatar de serveur ci-dessous)");
  }

  await message.reply({ embeds: [embed] });

  if (serverAvatar && serverAvatar !== globalAvatar) {
    const serverEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🖼️ Avatar serveur de ${user.username}`)
      .setImage(serverAvatar)
      .addFields(
        { name: "🔗 Liens", value: `[PNG](${member.displayAvatarURL({ extension: "png", size: 4096 })}) • [JPG](${member.displayAvatarURL({ extension: "jpg", size: 4096 })}) • [WEBP](${member.displayAvatarURL({ extension: "webp", size: 4096 })})${member.avatar?.startsWith("a_") ? ` • [GIF](${member.displayAvatarURL({ extension: "gif", size: 4096 })})` : ""}`, inline: false }
      );

    await message.channel.send({ embeds: [serverEmbed] });
  }
}

async function sendAvatarEmbedSlash(interaction, user, member) {
  const globalAvatar = user.displayAvatarURL({ dynamic: true, size: 4096 });
  const serverAvatar = member?.displayAvatarURL({ dynamic: true, size: 4096 });

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🖼️ Avatar de ${user.username}`)
    .setImage(globalAvatar)
    .addFields(
      { name: "🔗 Liens", value: `[PNG](${user.displayAvatarURL({ extension: "png", size: 4096 })}) • [JPG](${user.displayAvatarURL({ extension: "jpg", size: 4096 })}) • [WEBP](${user.displayAvatarURL({ extension: "webp", size: 4096 })})${user.avatar?.startsWith("a_") ? ` • [GIF](${user.displayAvatarURL({ extension: "gif", size: 4096 })})` : ""}`, inline: false }
    )
    .setFooter({ text: `Demandé par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();

  if (serverAvatar && serverAvatar !== globalAvatar) {
    embed.setDescription("**Avatar global** (avatar de serveur ci-dessous)");
  }

  await interaction.reply({ embeds: [embed] });

  if (serverAvatar && serverAvatar !== globalAvatar) {
    const serverEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🖼️ Avatar serveur de ${user.username}`)
      .setImage(serverAvatar)
      .addFields(
        { name: "🔗 Liens", value: `[PNG](${member.displayAvatarURL({ extension: "png", size: 4096 })}) • [JPG](${member.displayAvatarURL({ extension: "jpg", size: 4096 })}) • [WEBP](${member.displayAvatarURL({ extension: "webp", size: 4096 })})${member.avatar?.startsWith("a_") ? ` • [GIF](${member.displayAvatarURL({ extension: "gif", size: 4096 })})` : ""}`, inline: false }
      );

    await interaction.followUp({ embeds: [serverEmbed] });
  }
}
