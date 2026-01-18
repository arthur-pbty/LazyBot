const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const addCommand = require('../../fonctions/addCommand');
const db = require('../../db');

module.exports = addCommand({
  name: 'warnings',
  description: 'Voir les avertissements d\'un utilisateur',
  aliases: ['warns', 'warninfo', 'warnlist', 'infractions'],
  permissions: [],
  botOwnerOnly: false,
  dm: false,
  scope: 'global',
  slashOptions: [
    { type: 'USER', name: 'utilisateur', description: 'L\'utilisateur dont vous voulez voir les warns (par défaut: vous)', required: false }
  ],

  executeSlash: async (client, interaction) => {
    const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
    const guildId = interaction.guild.id;

    // Si l'utilisateur veut voir les warns d'un autre, il doit être modo
    if (targetUser.id !== interaction.user.id) {
      const member = interaction.member;
      if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        return interaction.reply({
          content: '❌ Vous ne pouvez voir que vos propres avertissements.',
          ephemeral: true
        });
      }
    }

    try {
      const warnings = await db.allAsync(
        "SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 25",
        [guildId, targetUser.id]
      );

      if (!warnings || warnings.length === 0) {
        return interaction.reply({
          content: `✅ **${targetUser.tag}** n'a aucun avertissement sur ce serveur.`,
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle(`⚠️ Avertissements de ${targetUser.tag}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
        .setDescription(`Total: **${warnings.length}** avertissement(s)`)
        .setTimestamp();

      // Ajouter les 10 derniers warns
      const recentWarns = warnings.slice(0, 10);
      for (const warn of recentWarns) {
        const moderator = await client.users.fetch(warn.moderator_id).catch(() => null);
        const date = new Date(warn.created_at * 1000).toLocaleDateString('fr-FR');
        const source = warn.source === 'manual' ? '👮 Manuel' : '🤖 Auto';
        
        embed.addFields({
          name: `#${warn.id} - ${date}`,
          value: `**Raison:** ${warn.reason}\n**Par:** ${moderator ? moderator.tag : 'Inconnu'} (${source})`,
          inline: false
        });
      }

      if (warnings.length > 10) {
        embed.setFooter({ text: `Affichage des 10 derniers sur ${warnings.length} avertissements` });
      }

      await interaction.reply({ embeds: [embed], ephemeral: targetUser.id === interaction.user.id });

    } catch (err) {
      console.error('Erreur warnings:', err);
      return interaction.reply({
        content: '❌ Une erreur est survenue.',
        ephemeral: true
      });
    }
  },

  executePrefix: async (client, message, args) => {
    let targetUser;
    
    if (args.length > 0) {
      const userId = args[0].replace(/[<@!>]/g, '');
      targetUser = await client.users.fetch(userId).catch(() => null);
      
      // Si l'utilisateur veut voir les warns d'un autre, il doit être modo
      if (targetUser && targetUser.id !== message.author.id) {
        if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
          return message.reply('❌ Vous ne pouvez voir que vos propres avertissements.');
        }
      }
    }
    
    if (!targetUser) {
      targetUser = message.author;
    }

    const guildId = message.guild.id;

    try {
      const warnings = await db.allAsync(
        "SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 25",
        [guildId, targetUser.id]
      );

      if (!warnings || warnings.length === 0) {
        return message.reply(`✅ **${targetUser.tag}** n'a aucun avertissement sur ce serveur.`);
      }

      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle(`⚠️ Avertissements de ${targetUser.tag}`)
        .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
        .setDescription(`Total: **${warnings.length}** avertissement(s)`)
        .setTimestamp();

      // Ajouter les 10 derniers warns
      const recentWarns = warnings.slice(0, 10);
      for (const warn of recentWarns) {
        const moderator = await client.users.fetch(warn.moderator_id).catch(() => null);
        const date = new Date(warn.created_at * 1000).toLocaleDateString('fr-FR');
        const source = warn.source === 'manual' ? '👮 Manuel' : '🤖 Auto';
        
        embed.addFields({
          name: `#${warn.id} - ${date}`,
          value: `**Raison:** ${warn.reason}\n**Par:** ${moderator ? moderator.tag : 'Inconnu'} (${source})`,
          inline: false
        });
      }

      if (warnings.length > 10) {
        embed.setFooter({ text: `Affichage des 10 derniers sur ${warnings.length} avertissements` });
      }

      await message.reply({ embeds: [embed] });

    } catch (err) {
      console.error('Erreur warnings:', err);
      return message.reply('❌ Une erreur est survenue.');
    }
  }
});
