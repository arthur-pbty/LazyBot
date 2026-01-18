const addCommand = require("../../fonctions/addCommand");
const { EmbedBuilder } = require("discord.js");
const os = require("os");

module.exports = addCommand({
  name: "botinfo",
  description: "Affiche les informations du bot.",
  aliases: ["bot", "bi", "stats"],
  permissions: [],
  botOwnerOnly: false,
  dm: true,
  scope: "global",

  slashOptions: [],

  executePrefix: async (client, message, args) => {
    const embed = createBotInfoEmbed(client, message.author);
    await message.reply({ embeds: [embed] });
  },

  executeSlash: async (client, interaction) => {
    const embed = createBotInfoEmbed(client, interaction.user);
    await interaction.reply({ embeds: [embed] });
  },
});

function createBotInfoEmbed(client, user) {
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  const uptimeString = `${days}j ${hours}h ${minutes}m ${seconds}s`;

  const memUsage = process.memoryUsage();
  const memUsed = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
  const memTotal = (memUsage.heapTotal / 1024 / 1024).toFixed(2);

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`🤖 Informations sur ${client.user.username}`)
    .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: "📛 Nom", value: client.user.tag, inline: true },
      { name: "🆔 ID", value: client.user.id, inline: true },
      { name: "📅 Créé le", value: `<t:${Math.floor(client.user.createdTimestamp / 1000)}:D>`, inline: true },
      { name: "⏱️ Uptime", value: uptimeString, inline: true },
      { name: "🏓 Latence", value: `${client.ws.ping}ms`, inline: true },
      { name: "💾 Mémoire", value: `${memUsed} / ${memTotal} MB`, inline: true },
      { name: "🖥️ Serveurs", value: `${client.guilds.cache.size}`, inline: true },
      { name: "👥 Utilisateurs", value: `${client.users.cache.size}`, inline: true },
      { name: "📺 Salons", value: `${client.channels.cache.size}`, inline: true },
      { name: "📚 Node.js", value: process.version, inline: true },
      { name: "📦 Discord.js", value: require("discord.js").version, inline: true },
      { name: "💻 OS", value: `${os.type()} ${os.release()}`, inline: true }
    )
    .setFooter({ text: `Demandé par ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();
}
