const addCommand = require("../../fonctions/addCommand");
const { EmbedBuilder } = require("discord.js");

module.exports = addCommand({
  name: "banner",
  description: "Affiche la bannière d'un utilisateur.",
  aliases: ["banniere"],
  permissions: [],
  botOwnerOnly: false,
  dm: false,
  scope: "global",

  slashOptions: [
    {
      type: "USER",
      name: "utilisateur",
      description: "L'utilisateur dont vous voulez voir la bannière",
      required: false,
    },
  ],

  executePrefix: async (client, message, args) => {
    const user = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null) || message.author;
    const fetchedUser = await user.fetch();

    if (!fetchedUser.banner) {
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription(`❌ **${user.username}** n'a pas de bannière.`)
        .setFooter({ text: `Demandé par ${message.author.username}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) });

      return message.reply({ embeds: [embed] });
    }

    const embed = createBannerEmbed(fetchedUser, user, message.author);
    await message.reply({ embeds: [embed] });
  },

  executeSlash: async (client, interaction) => {
    const user = interaction.options.getUser("utilisateur") || interaction.user;
    const fetchedUser = await user.fetch();

    if (!fetchedUser.banner) {
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription(`❌ **${user.username}** n'a pas de bannière.`)
        .setFooter({ text: `Demandé par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const embed = createBannerEmbed(fetchedUser, user, interaction.user);
    await interaction.reply({ embeds: [embed] });
  },
});

function createBannerEmbed(fetchedUser, user, requestedBy) {
  const bannerUrl = fetchedUser.bannerURL({ dynamic: true, size: 4096 });

  return new EmbedBuilder()
    .setColor(fetchedUser.accentColor || 0x5865F2)
    .setTitle(`🎨 Bannière de ${user.username}`)
    .setImage(bannerUrl)
    .addFields(
      { name: "🔗 Liens", value: `[PNG](${fetchedUser.bannerURL({ extension: "png", size: 4096 })}) • [JPG](${fetchedUser.bannerURL({ extension: "jpg", size: 4096 })}) • [WEBP](${fetchedUser.bannerURL({ extension: "webp", size: 4096 })})${fetchedUser.banner?.startsWith("a_") ? ` • [GIF](${fetchedUser.bannerURL({ extension: "gif", size: 4096 })})` : ""}`, inline: false }
    )
    .setFooter({ text: `Demandé par ${requestedBy.username}`, iconURL: requestedBy.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();
}
