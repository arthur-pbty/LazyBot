const addCommand = require("../fonctions/addCommand");
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = addCommand({
  name: "timeout",
  description: "Met un membre en timeout (exclusion temporaire).",
  aliases: ["mute", "to"],
  permissions: [PermissionFlagsBits.ModerateMembers],
  botOwnerOnly: false,
  dm: false,
  scope: "global",

  slashOptions: [
    {
      type: "USER",
      name: "utilisateur",
      description: "L'utilisateur à mettre en timeout",
      required: true,
    },
    {
      type: "STRING",
      name: "durée",
      description: "La durée du timeout (ex: 10m, 1h, 1d, 1w)",
      required: true,
    },
    {
      type: "STRING",
      name: "raison",
      description: "La raison du timeout",
      required: false,
    },
  ],

  executePrefix: async (client, message, args) => {
    const user = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!user) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription("❌ Veuillez mentionner un utilisateur.")] });
    }

    const durationStr = args[1];
    if (!durationStr) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription("❌ Veuillez spécifier une durée (ex: 10m, 1h, 1d).")] });
    }

    const reason = args.slice(2).join(" ") || "Aucune raison fournie";
    const member = message.guild.members.cache.get(user.id);

    await executeTimeout(member, user, durationStr, reason, message.member, message.author, message.guild, message);
  },

  executeSlash: async (client, interaction) => {
    const user = interaction.options.getUser("utilisateur");
    const durationStr = interaction.options.getString("durée");
    const reason = interaction.options.getString("raison") || "Aucune raison fournie";
    const member = interaction.guild.members.cache.get(user.id);

    await executeTimeout(member, user, durationStr, reason, interaction.member, interaction.user, interaction.guild, interaction);
  },
});

function parseDuration(durationStr) {
  const durationRegex = /^(\d+)(s|m|h|d|w)$/;
  const match = durationStr.match(durationRegex);

  if (!match) return null;

  const amount = parseInt(match[1]);
  const unit = match[2];

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };

  return { ms: amount * multipliers[unit], amount, unit };
}

async function executeTimeout(member, user, durationStr, reason, executor, moderator, guild, context) {
  const duration = parseDuration(durationStr);
  const maxTimeout = 28 * 24 * 60 * 60 * 1000;

  const sendError = async (msg) => {
    const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
    await context.reply({ embeds: [embed], ephemeral: true });
  };

  if (!duration) {
    return sendError("❌ Format de durée invalide. Utilisez: `10s`, `10m`, `1h`, `1d`, `1w`");
  }

  if (duration.ms > maxTimeout) {
    return sendError("❌ La durée maximale du timeout est de 28 jours.");
  }

  if (!member) {
    return sendError("❌ Cet utilisateur n'est pas sur ce serveur.");
  }

  if (member.id === executor.id) {
    return sendError("❌ Vous ne pouvez pas vous mettre en timeout vous-même.");
  }

  if (member.id === guild.ownerId) {
    return sendError("❌ Vous ne pouvez pas mettre le propriétaire en timeout.");
  }

  if (!member.moderatable) {
    return sendError("❌ Je ne peux pas mettre cet utilisateur en timeout. Vérifiez que mon rôle est au-dessus du sien.");
  }

  if (executor.roles.highest.position <= member.roles.highest.position && executor.id !== guild.ownerId) {
    return sendError("❌ Vous ne pouvez pas mettre en timeout quelqu'un avec un rôle égal ou supérieur au vôtre.");
  }

  try {
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`⏰ Vous avez été mis en timeout sur ${guild.name}`)
        .addFields(
          { name: "⏱️ Durée", value: durationStr },
          { name: "📋 Raison", value: reason },
          { name: "👮 Modérateur", value: moderator.tag }
        )
        .setTimestamp();
      await user.send({ embeds: [dmEmbed] });
    } catch (e) {}

    await member.timeout(duration.ms, `${reason} | Par ${moderator.tag}`);

    const unitNames = { s: "seconde(s)", m: "minute(s)", h: "heure(s)", d: "jour(s)", w: "semaine(s)" };
    const endTimestamp = Math.floor((Date.now() + duration.ms) / 1000);

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle("⏰ Membre mis en timeout")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "👤 Utilisateur", value: `${user.tag} (${user.id})`, inline: true },
        { name: "👮 Modérateur", value: moderator.tag, inline: true },
        { name: "⏱️ Durée", value: `${duration.amount} ${unitNames[duration.unit]}`, inline: true },
        { name: "🕐 Expire", value: `<t:${endTimestamp}:F>\n(<t:${endTimestamp}:R>)`, inline: false },
        { name: "📋 Raison", value: reason, inline: false }
      )
      .setFooter({ text: `Timeout par ${moderator.username}`, iconURL: moderator.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    await context.reply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    const errorEmbed = new EmbedBuilder().setColor(0xED4245).setDescription("❌ Une erreur est survenue lors du timeout.");
    await context.reply({ embeds: [errorEmbed], ephemeral: true });
  }
}
