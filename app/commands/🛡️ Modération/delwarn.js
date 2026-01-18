const { EmbedBuilder } = require('discord.js');
const addCommand = require('../../fonctions/addCommand');
const db = require('../../db');

module.exports = addCommand({
  name: 'delwarn',
  description: 'Supprimer un avertissement',
  aliases: ['removewarn', 'unwarn', 'clearwarn'],
  permissions: ['ModerateMembers'],
  botOwnerOnly: false,
  dm: false,
  scope: 'global',
  slashOptions: [
    { type: 'INTEGER', name: 'id', description: 'L\'ID de l\'avertissement à supprimer', required: true }
  ],

  executeSlash: async (client, interaction) => {
    const warnId = interaction.options.getInteger('id');
    const guildId = interaction.guild.id;

    try {
      // Vérifier que le warn existe
      const warn = await db.getAsync(
        "SELECT * FROM warnings WHERE id = ? AND guild_id = ?",
        [warnId, guildId]
      );

      if (!warn) {
        return interaction.reply({
          content: '❌ Avertissement non trouvé.',
          ephemeral: true
        });
      }

      // Supprimer le warn
      await new Promise((resolve, reject) => {
        db.run("DELETE FROM warnings WHERE id = ?", [warnId], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      const user = await client.users.fetch(warn.user_id).catch(() => null);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Avertissement supprimé')
        .addFields(
          { name: '🆔 Warn ID', value: `#${warnId}`, inline: true },
          { name: '👤 Utilisateur', value: user ? `${user.tag}` : warn.user_id, inline: true },
          { name: '📝 Raison originale', value: warn.reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error('Erreur delwarn:', err);
      return interaction.reply({
        content: '❌ Une erreur est survenue.',
        ephemeral: true
      });
    }
  },

  executePrefix: async (client, message, args) => {
    if (args.length < 1) {
      return message.reply('❌ Usage: `!delwarn <id>`');
    }

    const warnId = parseInt(args[0]);
    const guildId = message.guild.id;

    if (isNaN(warnId)) {
      return message.reply('❌ L\'ID doit être un nombre.');
    }

    try {
      // Vérifier que le warn existe
      const warn = await db.getAsync(
        "SELECT * FROM warnings WHERE id = ? AND guild_id = ?",
        [warnId, guildId]
      );

      if (!warn) {
        return message.reply('❌ Avertissement non trouvé.');
      }

      // Supprimer le warn
      await new Promise((resolve, reject) => {
        db.run("DELETE FROM warnings WHERE id = ?", [warnId], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      const user = await client.users.fetch(warn.user_id).catch(() => null);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Avertissement supprimé')
        .addFields(
          { name: '🆔 Warn ID', value: `#${warnId}`, inline: true },
          { name: '👤 Utilisateur', value: user ? `${user.tag}` : warn.user_id, inline: true },
          { name: '📝 Raison originale', value: warn.reason, inline: false }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (err) {
      console.error('Erreur delwarn:', err);
      return message.reply('❌ Une erreur est survenue.');
    }
  }
});
