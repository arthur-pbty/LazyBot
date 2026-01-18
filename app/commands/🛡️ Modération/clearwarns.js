const { EmbedBuilder } = require('discord.js');
const addCommand = require('../../fonctions/addCommand');
const db = require('../../db');

module.exports = addCommand({
  name: 'clearwarns',
  description: 'Supprimer tous les avertissements d\'un utilisateur',
  aliases: ['resetwarns', 'warnreset', 'warnclear'],
  permissions: ['Administrator'],
  botOwnerOnly: false,
  dm: false,
  scope: 'global',
  slashOptions: [
    { type: 'USER', name: 'utilisateur', description: 'L\'utilisateur dont vous voulez effacer les warns', required: true }
  ],

  executeSlash: async (client, interaction) => {
    const user = interaction.options.getUser('utilisateur');
    const guildId = interaction.guild.id;

    try {
      // Compter les warns avant suppression
      const countResult = await db.getAsync(
        "SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?",
        [guildId, user.id]
      );

      if (countResult.count === 0) {
        return interaction.reply({
          content: `✅ **${user.tag}** n'a aucun avertissement.`,
          ephemeral: true
        });
      }

      // Supprimer tous les warns
      await new Promise((resolve, reject) => {
        db.run(
          "DELETE FROM warnings WHERE guild_id = ? AND user_id = ?",
          [guildId, user.id],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Avertissements effacés')
        .setDescription(`Tous les avertissements de **${user.tag}** ont été supprimés.`)
        .addFields(
          { name: '👤 Utilisateur', value: `${user}`, inline: true },
          { name: '🗑️ Warns supprimés', value: `${countResult.count}`, inline: true },
          { name: '👮 Par', value: `${interaction.user}`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error('Erreur clearwarns:', err);
      return interaction.reply({
        content: '❌ Une erreur est survenue.',
        ephemeral: true
      });
    }
  },

  executePrefix: async (client, message, args) => {
    if (args.length < 1) {
      return message.reply('❌ Usage: `!clearwarns <@utilisateur>`');
    }

    const userId = args[0].replace(/[<@!>]/g, '');
    const user = await client.users.fetch(userId).catch(() => null);
    const guildId = message.guild.id;

    if (!user) {
      return message.reply('❌ Utilisateur non trouvé.');
    }

    try {
      // Compter les warns avant suppression
      const countResult = await db.getAsync(
        "SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?",
        [guildId, user.id]
      );

      if (countResult.count === 0) {
        return message.reply(`✅ **${user.tag}** n'a aucun avertissement.`);
      }

      // Supprimer tous les warns
      await new Promise((resolve, reject) => {
        db.run(
          "DELETE FROM warnings WHERE guild_id = ? AND user_id = ?",
          [guildId, user.id],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Avertissements effacés')
        .setDescription(`Tous les avertissements de **${user.tag}** ont été supprimés.`)
        .addFields(
          { name: '👤 Utilisateur', value: `${user}`, inline: true },
          { name: '🗑️ Warns supprimés', value: `${countResult.count}`, inline: true },
          { name: '👮 Par', value: `${message.author}`, inline: true }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (err) {
      console.error('Erreur clearwarns:', err);
      return message.reply('❌ Une erreur est survenue.');
    }
  }
});
