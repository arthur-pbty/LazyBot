const { EmbedBuilder } = require('discord.js');
const addCommand = require('../../fonctions/addCommand');

module.exports = addCommand({
  name: 'unban',
  description: 'Débannir un utilisateur par son ID ou pseudo',
  aliases: ['deban', 'pardon'],
  permissions: ['BanMembers'],
  botOwnerOnly: false,
  dm: false,
  scope: 'global',
  slashOptions: [
    { type: 'STRING', name: 'utilisateur', description: 'L\'ID ou le pseudo de l\'utilisateur à débannir', required: true },
    { type: 'STRING', name: 'raison', description: 'La raison du débannissement', required: false }
  ],

  executeSlash: async (client, interaction) => {
    const userInput = interaction.options.getString('utilisateur');
    const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';

    try {
      // Récupérer la liste des bans
      const bans = await interaction.guild.bans.fetch();
      
      if (bans.size === 0) {
        return interaction.reply({
          content: '❌ Aucun utilisateur n\'est banni sur ce serveur.',
          ephemeral: true
        });
      }

      // Chercher par ID ou par pseudo
      let bannedUser = null;
      
      // D'abord essayer par ID exact
      if (/^\d{17,19}$/.test(userInput)) {
        const ban = bans.get(userInput);
        if (ban) bannedUser = ban.user;
      }
      
      // Sinon chercher par pseudo (insensible à la casse)
      if (!bannedUser) {
        const searchLower = userInput.toLowerCase();
        for (const [, ban] of bans) {
          if (ban.user.username.toLowerCase() === searchLower ||
              ban.user.username.toLowerCase().includes(searchLower) ||
              ban.user.tag.toLowerCase() === searchLower ||
              ban.user.id === userInput) {
            bannedUser = ban.user;
            break;
          }
        }
      }

      if (!bannedUser) {
        // Afficher quelques bans pour aider
        const banList = bans.first(5).map(b => `• ${b.user.tag} (${b.user.id})`).join('\n');
        return interaction.reply({
          content: `❌ Utilisateur banni non trouvé.\n\n**Quelques utilisateurs bannis:**\n${banList || 'Aucun'}`,
          ephemeral: true
        });
      }

      // Débannir
      await interaction.guild.members.unban(bannedUser.id, reason);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Utilisateur débanni')
        .setThumbnail(bannedUser.displayAvatarURL({ size: 64 }))
        .addFields(
          { name: '👤 Utilisateur', value: `${bannedUser.tag}`, inline: true },
          { name: '🆔 ID', value: bannedUser.id, inline: true },
          { name: '👮 Modérateur', value: `${interaction.user}`, inline: true },
          { name: '📝 Raison', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error('Erreur unban:', err);
      return interaction.reply({
        content: '❌ Une erreur est survenue lors du débannissement.',
        ephemeral: true
      });
    }
  },

  executePrefix: async (client, message, args) => {
    if (args.length < 1) {
      return message.reply('❌ Usage: `!unban <ID ou pseudo> [raison]`');
    }

    const userInput = args[0];
    const reason = args.slice(1).join(' ') || 'Aucune raison spécifiée';

    try {
      // Récupérer la liste des bans
      const bans = await message.guild.bans.fetch();
      
      if (bans.size === 0) {
        return message.reply('❌ Aucun utilisateur n\'est banni sur ce serveur.');
      }

      // Chercher par ID ou par pseudo
      let bannedUser = null;
      
      // D'abord essayer par ID exact
      if (/^\d{17,19}$/.test(userInput)) {
        const ban = bans.get(userInput);
        if (ban) bannedUser = ban.user;
      }
      
      // Sinon chercher par pseudo (insensible à la casse)
      if (!bannedUser) {
        const searchLower = userInput.toLowerCase();
        for (const [, ban] of bans) {
          if (ban.user.username.toLowerCase() === searchLower ||
              ban.user.username.toLowerCase().includes(searchLower) ||
              ban.user.tag.toLowerCase() === searchLower ||
              ban.user.id === userInput) {
            bannedUser = ban.user;
            break;
          }
        }
      }

      if (!bannedUser) {
        const banList = bans.first(5).map(b => `• ${b.user.tag} (${b.user.id})`).join('\n');
        return message.reply(`❌ Utilisateur banni non trouvé.\n\n**Quelques utilisateurs bannis:**\n${banList || 'Aucun'}`);
      }

      // Débannir
      await message.guild.members.unban(bannedUser.id, reason);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Utilisateur débanni')
        .setThumbnail(bannedUser.displayAvatarURL({ size: 64 }))
        .addFields(
          { name: '👤 Utilisateur', value: `${bannedUser.tag}`, inline: true },
          { name: '🆔 ID', value: bannedUser.id, inline: true },
          { name: '👮 Modérateur', value: `${message.author}`, inline: true },
          { name: '📝 Raison', value: reason, inline: false }
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });

    } catch (err) {
      console.error('Erreur unban:', err);
      return message.reply('❌ Une erreur est survenue lors du débannissement.');
    }
  }
});
