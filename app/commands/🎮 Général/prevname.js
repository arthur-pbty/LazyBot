const { EmbedBuilder } = require('discord.js');
const addCommand = require('../../fonctions/addCommand');
const db = require('../../db');

module.exports = addCommand({
  name: 'prevname',
  description: 'Affiche l\'historique des noms d\'un utilisateur',
  aliases: ['pn', 'previousname', 'namehistory'],
  permissions: [],
  botOwnerOnly: false,
  dm: false,
  scope: 'global',

  slashOptions: [
    {
      name: 'type',
      description: 'Type d\'historique à afficher',
      type: 'STRING',
      required: true,
      choices: [
        { name: '🌍 Global (nom d\'utilisateur)', value: 'global' },
        { name: '🏠 Serveur (pseudo sur ce serveur)', value: 'server' }
      ]
    },
    {
      name: 'utilisateur',
      description: 'L\'utilisateur dont vous voulez voir l\'historique des noms',
      type: 'USER',
      required: false
    }
  ],

  executeSlash: async (client, interaction) => {
    const type = interaction.options.getString('type');
    const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
    await showPrevNames(client, interaction, targetUser, type);
  },

  executePrefix: async (client, message, args) => {
    let type = 'global';
    let targetUser = message.author;

    if (args.length > 0) {
      // Premier argument: type (global ou server)
      if (args[0].toLowerCase() === 'global' || args[0].toLowerCase() === 'g') {
        type = 'global';
        args.shift();
      } else if (args[0].toLowerCase() === 'server' || args[0].toLowerCase() === 's' || args[0].toLowerCase() === 'serveur') {
        type = 'server';
        args.shift();
      }

      // Deuxième argument: utilisateur
      if (args.length > 0) {
        const mention = message.mentions.users.first();
        if (mention) {
          targetUser = mention;
        } else {
          try {
            targetUser = await client.users.fetch(args[0]);
          } catch {
            return message.reply('❌ Utilisateur non trouvé.');
          }
        }
      }
    }

    await showPrevNames(client, message, targetUser, type);
  }
});

async function showPrevNames(client, ctx, user, type) {
  try {
    const isGlobal = type === 'global';
    const guildId = ctx.guild?.id || ctx.guildId;

    let history;
    let title;
    let currentName;

    if (isGlobal) {
      // Historique global (noms d'utilisateur)
      history = await db.allAsync(
        `SELECT username, display_name, changed_at 
         FROM username_history 
         WHERE user_id = ? 
         ORDER BY changed_at DESC 
         LIMIT 25`,
        [user.id]
      );
      title = `🌍 Historique global de ${user.username}`;
      currentName = user.username;
      if (user.displayName && user.displayName !== user.username) {
        currentName += ` (${user.displayName})`;
      }
    } else {
      // Historique serveur (pseudos)
      if (!guildId) {
        return ctx.reply({ content: '❌ Cette option n\'est disponible que sur un serveur.', ephemeral: true });
      }

      history = await db.allAsync(
        `SELECT nickname, changed_at 
         FROM nickname_history 
         WHERE guild_id = ? AND user_id = ? 
         ORDER BY changed_at DESC 
         LIMIT 25`,
        [guildId, user.id]
      );

      const guild = ctx.guild || client.guilds.cache.get(guildId);
      const member = guild?.members.cache.get(user.id);
      title = `🏠 Historique serveur de ${user.username}`;
      currentName = member?.nickname || user.username;
    }

    const embed = new EmbedBuilder()
      .setColor(isGlobal ? 0x5865F2 : 0x57F287)
      .setAuthor({
        name: title,
        iconURL: user.displayAvatarURL({ size: 64 })
      })
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .setFooter({ text: `ID: ${user.id} • ${isGlobal ? 'Global' : 'Serveur'}` })
      .setTimestamp();

    if (history.length === 0) {
      const noHistoryMsg = isGlobal 
        ? '📭 Aucun historique de nom global trouvé.\n\n*L\'historique est enregistré lorsque l\'utilisateur change son nom d\'utilisateur Discord.*'
        : '📭 Aucun historique de pseudo serveur trouvé.\n\n*L\'historique est enregistré lorsque le pseudo sur ce serveur change.*';
      embed.setDescription(noHistoryMsg);
    } else {
      let description = `**${isGlobal ? 'Nom actuel' : 'Pseudo actuel'}:** \`${currentName}\`\n\n`;
      description += `**📜 ${isGlobal ? 'Anciens noms' : 'Anciens pseudos'}:**\n`;

      const namesList = history.map((entry, index) => {
        const date = `<t:${entry.changed_at}:R>`;
        const name = isGlobal 
          ? (entry.display_name && entry.display_name !== entry.username 
              ? `\`${entry.username}\` (${entry.display_name})`
              : `\`${entry.username}\``)
          : `\`${entry.nickname || user.username}\``;
        return `${index + 1}. ${name} — ${date}`;
      }).join('\n');

      description += namesList;

      if (history.length >= 25) {
        description += '\n\n*... et potentiellement plus*';
      }

      embed.setDescription(description);
    }

    await ctx.reply({ embeds: [embed] });

  } catch (err) {
    console.error('Erreur commande prevname:', err);
    await ctx.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
  }
}
