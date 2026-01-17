const addCommand = require("../fonctions/addCommand");
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = addCommand({
  name: "clear",
  description: "Supprime un nombre de messages dans le salon.",
  aliases: ["purge", "supprimer", "delete"],
  permissions: [PermissionFlagsBits.ManageMessages],
  botOwnerOnly: false,
  dm: false,
  scope: "global",

  slashOptions: [
    {
      type: "INTEGER",
      name: "nombre",
      description: "Le nombre de messages à supprimer (1-100)",
      required: true,
    },
    {
      type: "USER",
      name: "utilisateur",
      description: "Supprimer uniquement les messages de cet utilisateur",
      required: false,
    },
  ],

  executePrefix: async (client, message, args) => {
    const amount = parseInt(args[0]);
    if (!amount || amount < 1 || amount > 100) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription("❌ Veuillez spécifier un nombre entre 1 et 100.")] });
    }

    const targetUser = message.mentions.users.first();
    
    // Supprimer le message de commande
    await message.delete().catch(() => {});
    
    await executeClear(message.channel, amount, targetUser, message.author);
  },

  executeSlash: async (client, interaction) => {
    const amount = interaction.options.getInteger("nombre");
    const targetUser = interaction.options.getUser("utilisateur");

    await interaction.deferReply({ ephemeral: true });
    await executeClearSlash(interaction, amount, targetUser);
  },
});

async function executeClear(channel, amount, targetUser, moderator) {
  try {
    let messages = await channel.messages.fetch({ limit: 100 });

    if (targetUser) {
      messages = messages.filter(m => m.author.id === targetUser.id);
    }

    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    messages = messages.filter(m => m.createdTimestamp > twoWeeksAgo);

    const messagesToDelete = [...messages.values()].slice(0, amount);

    if (messagesToDelete.length === 0) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription("❌ Aucun message à supprimer.");
      const errorMsg = await channel.send({ embeds: [errorEmbed] });
      setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
      return;
    }

    const deleted = await channel.bulkDelete(messagesToDelete, true);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setDescription(`🗑️ **${deleted.size}** message(s) supprimé(s) par ${moderator}.`);

    if (targetUser) {
      embed.addFields({ name: "👤 Utilisateur ciblé", value: targetUser.tag, inline: true });
    }

    const confirmMsg = await channel.send({ embeds: [embed] });
    setTimeout(() => confirmMsg.delete().catch(() => {}), 5000);
  } catch (error) {
    console.error(error);
    const errorEmbed = new EmbedBuilder().setColor(0xED4245).setDescription("❌ Une erreur est survenue lors de la suppression.");
    const errorMsg = await channel.send({ embeds: [errorEmbed] });
    setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
  }
}

async function executeClearSlash(interaction, amount, targetUser) {
  try {
    let messages = await interaction.channel.messages.fetch({ limit: 100 });

    if (targetUser) {
      messages = messages.filter(m => m.author.id === targetUser.id);
    }

    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    messages = messages.filter(m => m.createdTimestamp > twoWeeksAgo);

    const messagesToDelete = [...messages.values()].slice(0, amount);

    if (messagesToDelete.length === 0) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xED4245).setDescription("❌ Aucun message à supprimer (les messages de plus de 14 jours ne peuvent pas être supprimés en masse).")]
      });
    }

    const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle("🗑️ Messages supprimés")
      .setDescription(`**${deleted.size}** message(s) supprimé(s) avec succès.`)
      .addFields(
        { name: "📺 Salon", value: `<#${interaction.channel.id}>`, inline: true },
        { name: "👮 Modérateur", value: interaction.user.tag, inline: true }
      )
      .setFooter({ text: `Supprimé par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    if (targetUser) {
      embed.addFields({ name: "👤 Utilisateur ciblé", value: targetUser.tag, inline: true });
    }

    await interaction.editReply({ embeds: [embed] });

    const confirmEmbed = new EmbedBuilder()
      .setColor(0x57F287)
      .setDescription(`🗑️ **${deleted.size}** message(s) supprimé(s) par ${interaction.user}.`);

    const confirmMsg = await interaction.channel.send({ embeds: [confirmEmbed] });
    setTimeout(() => confirmMsg.delete().catch(() => {}), 5000);
  } catch (error) {
    console.error(error);
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xED4245).setDescription("❌ Une erreur est survenue lors de la suppression des messages.")]
    });
  }
}
