const addCommand = require("../fonctions/addCommand");
const { EmbedBuilder, ChannelType } = require("discord.js");

module.exports = addCommand({
  name: "serverinfo",
  description: "Affiche les informations du serveur.",
  aliases: ["server", "si", "serveur"],
  permissions: [],
  botOwnerOnly: false,
  dm: false,
  scope: "global",

  slashOptions: [],

  executePrefix: async (client, message, args) => {
    const embed = await createServerInfoEmbed(message.guild, message.author);
    await message.reply({ embeds: [embed] });
  },

  executeSlash: async (client, interaction) => {
    const embed = await createServerInfoEmbed(interaction.guild, interaction.user);
    await interaction.reply({ embeds: [embed] });
  },
});

async function createServerInfoEmbed(guild, user) {
  await guild.members.fetch();

  const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
  const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
  const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

  const onlineMembers = guild.members.cache.filter(m => m.presence?.status !== "offline").size;
  const botCount = guild.members.cache.filter(m => m.user.bot).size;
  const humanCount = guild.memberCount - botCount;

  const verificationLevels = {
    0: "Aucune",
    1: "Faible",
    2: "Moyenne",
    3: "Haute",
    4: "Très haute"
  };

  const boostLevel = guild.premiumTier ? `Niveau ${guild.premiumTier}` : "Aucun";

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`📊 Informations sur ${guild.name}`)
    .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: "📛 Nom", value: guild.name, inline: true },
      { name: "🆔 ID", value: guild.id, inline: true },
      { name: "👑 Propriétaire", value: `<@${guild.ownerId}>`, inline: true },
      { name: "📅 Créé le", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
      { name: "🔒 Vérification", value: verificationLevels[guild.verificationLevel], inline: true },
      { name: "🚀 Boost", value: `${boostLevel} (${guild.premiumSubscriptionCount || 0} boosts)`, inline: true },
      { name: "👥 Membres", value: `Total: ${guild.memberCount}\n👤 Humains: ${humanCount}\n🤖 Bots: ${botCount}\n🟢 En ligne: ${onlineMembers}`, inline: true },
      { name: "📺 Salons", value: `💬 Textuels: ${textChannels}\n🔊 Vocaux: ${voiceChannels}\n📁 Catégories: ${categories}`, inline: true },
      { name: "🎭 Rôles", value: `${guild.roles.cache.size}`, inline: true },
      { name: "😀 Emojis", value: `${guild.emojis.cache.size}`, inline: true },
      { name: "🎨 Stickers", value: `${guild.stickers.cache.size}`, inline: true }
    )
    .setFooter({ text: `Demandé par ${user.username}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();

  if (guild.bannerURL()) {
    embed.setImage(guild.bannerURL({ size: 512 }));
  }

  return embed;
}
