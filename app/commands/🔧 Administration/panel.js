const addCommand = require("../../fonctions/addCommand");
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

module.exports = addCommand({
  name: "panel",
  description: "Affiche le lien vers le dashboard du serveur.",
  aliases: ["dashboard", "dash", "web"],
  permissions: [],
  botOwnerOnly: false,
  dm: false,
  scope: "global",

  slashOptions: [],

  executePrefix: async (client, message, args) => {
    const embed = createPanelEmbed(message.guild, message.author, client);
    const row = createPanelButton(message.guild.id);
    await message.reply({ embeds: [embed], components: [row] });
  },

  executeSlash: async (client, interaction) => {
    const embed = createPanelEmbed(interaction.guild, interaction.user, client);
    const row = createPanelButton(interaction.guild.id);
    await interaction.reply({ embeds: [embed], components: [row] });
  },
});

function createPanelEmbed(guild, user, client) {
  const dashboardUrl = `${process.env.URL}/guild/${guild.id}`;

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("🎛️ Panel de configuration")
    .setDescription(`Accédez au dashboard pour configurer **${guild.name}** !`)
    .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: "🔗 Lien direct", value: dashboardUrl, inline: false },
      { name: "⚙️ Fonctionnalités", value: "• Système de niveaux\n• Économie\n• Messages de bienvenue/au revoir\n• Auto-rôles\n• Et plus encore !", inline: false }
    )
    .setFooter({ text: `Demandé par ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();
}

function createPanelButton(guildId) {
  const dashboardUrl = `${process.env.URL}/guild/${guildId}`;

  const button = new ButtonBuilder()
    .setLabel("Ouvrir le Dashboard")
    .setStyle(ButtonStyle.Link)
    .setURL(dashboardUrl)
    .setEmoji("🌐");

  return new ActionRowBuilder().addComponents(button);
}
