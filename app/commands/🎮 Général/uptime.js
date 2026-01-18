const addCommand = require("../../fonctions/addCommand");
const { EmbedBuilder } = require("discord.js");

module.exports = addCommand({
  name: "uptime",
  description: "Affiche depuis combien de temps le bot est en ligne.",
  aliases: ["up", "online"],
  permissions: [],
  botOwnerOnly: false,
  dm: true,
  scope: "global",

  slashOptions: [],

  executePrefix: async (client, message, args) => {
    const embed = createUptimeEmbed(message.author);
    await message.reply({ embeds: [embed] });
  },

  executeSlash: async (client, interaction) => {
    const embed = createUptimeEmbed(interaction.user);
    await interaction.reply({ embeds: [embed] });
  },
});

function createUptimeEmbed(user) {
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  const startTimestamp = Math.floor((Date.now() - uptime * 1000) / 1000);

  return new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle("⏱️ Uptime")
    .setDescription(`Le bot est en ligne depuis **${days}** jours, **${hours}** heures, **${minutes}** minutes et **${seconds}** secondes.`)
    .addFields(
      { name: "🚀 Démarré", value: `<t:${startTimestamp}:F>\n(<t:${startTimestamp}:R>)`, inline: true }
    )
    .setFooter({ text: `Demandé par ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();
}
