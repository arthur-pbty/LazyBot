const addCommand = require("../../fonctions/addCommand");
const { EmbedBuilder } = require("discord.js");

module.exports = addCommand({
  name: "userinfo",
  description: "Affiche les informations d'un utilisateur.",
  aliases: ["user", "ui", "whois", "membre"],
  permissions: [],
  botOwnerOnly: false,
  dm: false,
  scope: "global",

  slashOptions: [
    {
      type: "USER",
      name: "utilisateur",
      description: "L'utilisateur dont vous voulez voir les informations",
      required: false,
    },
  ],

  executePrefix: async (client, message, args) => {
    const user = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null) || message.author;
    const member = message.guild.members.cache.get(user.id);
    const embed = createUserInfoEmbed(user, member, message.guild, message.author);
    await message.reply({ embeds: [embed] });
  },

  executeSlash: async (client, interaction) => {
    const user = interaction.options.getUser("utilisateur") || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);
    const embed = createUserInfoEmbed(user, member, interaction.guild, interaction.user);
    await interaction.reply({ embeds: [embed] });
  },
});

function createUserInfoEmbed(user, member, guild, requestedBy) {
  const flags = user.flags?.toArray() || [];
  const badges = {
    ActiveDeveloper: "👨‍💻 Développeur Actif",
    BugHunterLevel1: "🐛 Bug Hunter Niveau 1",
    BugHunterLevel2: "🐛 Bug Hunter Niveau 2",
    CertifiedModerator: "🛡️ Modérateur Certifié",
    HypeSquadOnlineHouse1: "🏠 HypeSquad Bravery",
    HypeSquadOnlineHouse2: "🏠 HypeSquad Brilliance",
    HypeSquadOnlineHouse3: "🏠 HypeSquad Balance",
    Hypesquad: "🎉 HypeSquad Events",
    Partner: "👥 Partenaire Discord",
    PremiumEarlySupporter: "💎 Early Supporter",
    Staff: "⚙️ Staff Discord",
    VerifiedBot: "✅ Bot Vérifié",
    VerifiedDeveloper: "🔧 Développeur Vérifié"
  };

  const userBadges = flags.map(flag => badges[flag] || flag).join("\n") || "Aucun";

  const status = {
    online: "🟢 En ligne",
    idle: "🟡 Inactif",
    dnd: "🔴 Ne pas déranger",
    offline: "⚫ Hors ligne"
  };

  const embed = new EmbedBuilder()
    .setColor(member?.displayHexColor || 0x5865F2)
    .setTitle(`👤 Informations sur ${user.username}`)
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: "📛 Nom", value: user.tag, inline: true },
      { name: "🆔 ID", value: user.id, inline: true },
      { name: "🤖 Bot", value: user.bot ? "Oui" : "Non", inline: true },
      { name: "📅 Compte créé le", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>\n(<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`, inline: true }
    );

  if (member) {
    embed.addFields(
      { name: "📥 A rejoint le", value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>\n(<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`, inline: true },
      { name: "📊 Statut", value: status[member.presence?.status || "offline"], inline: true },
      { name: "🎨 Couleur", value: member.displayHexColor, inline: true },
      { name: `🎭 Rôles (${member.roles.cache.size - 1})`, value: member.roles.cache.filter(r => r.id !== guild.id).map(r => r.toString()).slice(0, 10).join(", ") || "Aucun", inline: false }
    );

    if (member.premiumSinceTimestamp) {
      embed.addFields({ name: "🚀 Booster depuis", value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:D>`, inline: true });
    }
  }

  embed.addFields({ name: "🏅 Badges", value: userBadges, inline: false });

  embed
    .setFooter({ text: `Demandé par ${requestedBy.username}`, iconURL: requestedBy.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();

  return embed;
}
