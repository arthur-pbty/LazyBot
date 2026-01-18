const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const addCommand = require('../../fonctions/addCommand');
const db = require('../../db');
const { checkWarningSanctions } = require('../../fonctions/antiraid');

module.exports = addCommand({
  name: 'warn',
  description: 'Avertir un utilisateur',
  aliases: ['avertir', 'avertissement'],
  permissions: ['ModerateMembers'],
  botOwnerOnly: false,
  dm: false,
  scope: 'global',
  slashOptions: [
    { type: 'USER', name: 'utilisateur', description: 'L\'utilisateur à avertir', required: true },
    { type: 'STRING', name: 'raison', description: 'La raison de l\'avertissement', required: true }
  ],

  executeSlash: async (client, interaction) => {
    const user = interaction.options.getUser('utilisateur');
    const reason = interaction.options.getString('raison');
    const moderator = interaction.user;
    const guildId = interaction.guild.id;

    // Vérifier qu'on ne peut pas warn un admin/mod
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member && member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        content: '❌ Vous ne pouvez pas avertir un modérateur.',
        ephemeral: true
      });
    }

    try {
      // Ajouter le warn
      const warnId = await new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO warnings (guild_id, user_id, moderator_id, reason, source) VALUES (?, ?, ?, ?, ?)",
          [guildId, user.id, moderator.id, reason, 'manual'],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      // Compter les warns
      const countResult = await db.getAsync(
        "SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?",
        [guildId, user.id]
      );

      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('⚠️ Avertissement')
        .setDescription(`**${user.tag}** a reçu un avertissement.`)
        .addFields(
          { name: '👤 Utilisateur', value: `${user}`, inline: true },
          { name: '👮 Modérateur', value: `${moderator}`, inline: true },
          { name: '📊 Total warns', value: `${countResult.count}`, inline: true },
          { name: '📝 Raison', value: reason, inline: false },
          { name: '🆔 Warn ID', value: `#${warnId}`, inline: true }
        )
        .setThumbnail(user.displayAvatarURL({ size: 64 }))
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Notifier l'utilisateur en MP
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('⚠️ Vous avez reçu un avertissement')
          .setDescription(`Vous avez été averti sur **${interaction.guild.name}**.`)
          .addFields(
            { name: '📝 Raison', value: reason },
            { name: '📊 Total avertissements', value: `${countResult.count}` }
          )
          .setTimestamp();
        await user.send({ embeds: [dmEmbed] });
      } catch {}

      // Vérifier les sanctions automatiques
      await checkWarningSanctions(guildId, user.id, client);

    } catch (err) {
      console.error('Erreur warn:', err);
      return interaction.reply({
        content: '❌ Une erreur est survenue.',
        ephemeral: true
      });
    }
  },

  executePrefix: async (client, message, args) => {
    if (args.length < 2) {
      return message.reply('❌ Usage: `!warn <@utilisateur> <raison>`');
    }

    const userMention = args[0];
    const userId = userMention.replace(/[<@!>]/g, '');
    const reason = args.slice(1).join(' ');
    const moderator = message.author;
    const guildId = message.guild.id;

    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) {
      return message.reply('❌ Utilisateur non trouvé.');
    }

    // Vérifier qu'on ne peut pas warn un admin/mod
    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (member && member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply('❌ Vous ne pouvez pas avertir un modérateur.');
    }

    try {
      // Ajouter le warn
      const warnId = await new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO warnings (guild_id, user_id, moderator_id, reason, source) VALUES (?, ?, ?, ?, ?)",
          [guildId, user.id, moderator.id, reason, 'manual'],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });

      // Compter les warns
      const countResult = await db.getAsync(
        "SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?",
        [guildId, user.id]
      );

      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('⚠️ Avertissement')
        .setDescription(`**${user.tag}** a reçu un avertissement.`)
        .addFields(
          { name: '👤 Utilisateur', value: `${user}`, inline: true },
          { name: '👮 Modérateur', value: `${moderator}`, inline: true },
          { name: '📊 Total warns', value: `${countResult.count}`, inline: true },
          { name: '📝 Raison', value: reason, inline: false },
          { name: '🆔 Warn ID', value: `#${warnId}`, inline: true }
        )
        .setThumbnail(user.displayAvatarURL({ size: 64 }))
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      // Notifier l'utilisateur en MP
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('⚠️ Vous avez reçu un avertissement')
          .setDescription(`Vous avez été averti sur **${message.guild.name}**.`)
          .addFields(
            { name: '📝 Raison', value: reason },
            { name: '📊 Total avertissements', value: `${countResult.count}` }
          )
          .setTimestamp();
        await user.send({ embeds: [dmEmbed] });
      } catch {}

      // Vérifier les sanctions automatiques
      await checkWarningSanctions(guildId, user.id, client);

    } catch (err) {
      console.error('Erreur warn:', err);
      return message.reply('❌ Une erreur est survenue.');
    }
  }
});
