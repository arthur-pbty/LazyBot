const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const addCommand = require('../../fonctions/addCommand');
const db = require('../../db');

const buttonStyles = {
  'primary': ButtonStyle.Primary,
  'secondary': ButtonStyle.Secondary,
  'success': ButtonStyle.Success,
  'danger': ButtonStyle.Danger
};

// Fonction pour créer/mettre à jour le message du panel
async function updatePanelMessage(client, panel, buttons) {
  try {
    const guild = client.guilds.cache.get(panel.guild_id);
    if (!guild) return null;

    const channel = guild.channels.cache.get(panel.channel_id);
    if (!channel) return null;

    // Créer l'embed
    const embed = new EmbedBuilder()
      .setColor(panel.color || '#5865F2')
      .setTitle(panel.title || '🎭 Choisissez vos rôles')
      .setDescription(panel.description || 'Cliquez sur les boutons ci-dessous pour obtenir ou retirer des rôles.');

    if (panel.image_url) embed.setImage(panel.image_url);
    if (panel.thumbnail_url) embed.setThumbnail(panel.thumbnail_url);

    // Infos sur le mode
    const modeText = panel.exclusive 
      ? '⚠️ *Un seul rôle possible à la fois*' 
      : (panel.mode === 'toggle' ? '💡 *Cliquez à nouveau pour retirer un rôle*' : '');
    
    if (modeText) {
      embed.setFooter({ text: modeText });
    }

    // Créer les boutons (max 5 par ligne, max 5 lignes)
    const rows = [];
    const enabledButtons = buttons.filter(b => b.enabled).sort((a, b) => a.position - b.position);

    for (let i = 0; i < enabledButtons.length && rows.length < 5; i += 5) {
      const row = new ActionRowBuilder();
      const rowButtons = enabledButtons.slice(i, i + 5);

      for (const btn of rowButtons) {
        const button = new ButtonBuilder()
          .setCustomId(`role_panel_${btn.id}`)
          .setLabel(btn.label)
          .setStyle(buttonStyles[btn.style] || ButtonStyle.Primary);

        if (btn.emoji) {
          // Vérifier si c'est un emoji custom ou unicode
          if (btn.emoji.match(/^\d+$/)) {
            button.setEmoji({ id: btn.emoji });
          } else {
            button.setEmoji(btn.emoji);
          }
        }

        row.addComponents(button);
      }

      if (row.components.length > 0) {
        rows.push(row);
      }
    }

    // Mettre à jour ou créer le message
    if (panel.message_id) {
      try {
        const message = await channel.messages.fetch(panel.message_id);
        await message.edit({ embeds: [embed], components: rows });
        return panel.message_id;
      } catch {
        // Message introuvable, en créer un nouveau
      }
    }

    const message = await channel.send({ embeds: [embed], components: rows });
    
    // Sauvegarder l'ID du message
    await new Promise((resolve, reject) => {
      db.run("UPDATE role_panels SET message_id = ? WHERE id = ?", [message.id, panel.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return message.id;

  } catch (err) {
    console.error('Erreur mise à jour panel:', err);
    return null;
  }
}

module.exports = addCommand({
  name: 'rolepanel',
  description: 'Créer un panneau de rôles interactif',
  aliases: ['rp', 'rolebuttons', 'reactionroles'],
  permissions: ['ManageRoles', 'ManageMessages'],
  botOwnerOnly: false,
  dm: false,
  scope: 'global',
  slashOptions: [
    { type: 'STRING', name: 'action', description: 'Action à effectuer', required: true, choices: [
      { name: 'Créer un panel', value: 'create' },
      { name: 'Ajouter un bouton', value: 'addbutton' },
      { name: 'Supprimer un panel', value: 'delete' },
      { name: 'Liste des panels', value: 'list' },
      { name: 'Actualiser un panel', value: 'refresh' }
    ]},
    { type: 'STRING', name: 'nom', description: 'Nom du panel', required: false },
    { type: 'CHANNEL', name: 'salon', description: 'Salon où envoyer le panel', required: false },
    { type: 'ROLE', name: 'role', description: 'Rôle à associer (pour addbutton)', required: false },
    { type: 'STRING', name: 'label', description: 'Texte du bouton', required: false },
    { type: 'STRING', name: 'emoji', description: 'Emoji du bouton', required: false }
  ],

  executeSlash: async (client, interaction) => {
    const action = interaction.options.getString('action');
    const guildId = interaction.guild.id;

    switch (action) {
      case 'create': {
        const name = interaction.options.getString('nom');
        const channel = interaction.options.getChannel('salon');

        if (!name || !channel) {
          return interaction.reply({
            content: '❌ Vous devez spécifier un nom et un salon.\nUsage: `/rolepanel create nom:MonPanel salon:#roles`',
            ephemeral: true
          });
        }

        if (channel.type !== ChannelType.GuildText) {
          return interaction.reply({
            content: '❌ Le salon doit être un salon textuel.',
            ephemeral: true
          });
        }

        // Vérifier si un panel avec ce nom existe déjà
        const existing = await db.getAsync(
          "SELECT id FROM role_panels WHERE guild_id = ? AND name = ?",
          [guildId, name]
        );

        if (existing) {
          return interaction.reply({
            content: '❌ Un panel avec ce nom existe déjà.',
            ephemeral: true
          });
        }

        // Créer le panel
        const panelId = await new Promise((resolve, reject) => {
          db.run(
            "INSERT INTO role_panels (guild_id, channel_id, name, title, description) VALUES (?, ?, ?, ?, ?)",
            [guildId, channel.id, name, `🎭 ${name}`, 'Cliquez sur les boutons ci-dessous pour obtenir vos rôles.'],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Panel créé')
          .setDescription(`Le panel **${name}** a été créé.`)
          .addFields(
            { name: '📁 Salon', value: `${channel}`, inline: true },
            { name: '🆔 ID', value: `${panelId}`, inline: true }
          )
          .setFooter({ text: 'Ajoutez des boutons avec /rolepanel addbutton' });

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      case 'addbutton': {
        const name = interaction.options.getString('nom');
        const role = interaction.options.getRole('role');
        const label = interaction.options.getString('label');
        const emoji = interaction.options.getString('emoji');

        if (!name || !role) {
          return interaction.reply({
            content: '❌ Vous devez spécifier le nom du panel et un rôle.\nUsage: `/rolepanel addbutton nom:MonPanel role:@MonRole label:Mon Rôle emoji:🎮`',
            ephemeral: true
          });
        }

        // Trouver le panel
        const panel = await db.getAsync(
          "SELECT * FROM role_panels WHERE guild_id = ? AND name = ?",
          [guildId, name]
        );

        if (!panel) {
          return interaction.reply({
            content: `❌ Panel "${name}" non trouvé. Utilisez \`/rolepanel list\` pour voir les panels existants.`,
            ephemeral: true
          });
        }

        // Vérifier le nombre de boutons (max 25)
        const buttonCount = await db.getAsync(
          "SELECT COUNT(*) as count FROM role_panel_buttons WHERE panel_id = ?",
          [panel.id]
        );

        if (buttonCount.count >= 25) {
          return interaction.reply({
            content: '❌ Ce panel a atteint la limite de 25 boutons.',
            ephemeral: true
          });
        }

        // Ajouter le bouton
        await new Promise((resolve, reject) => {
          db.run(
            "INSERT INTO role_panel_buttons (panel_id, role_id, label, emoji, position) VALUES (?, ?, ?, ?, ?)",
            [panel.id, role.id, label || role.name, emoji || null, buttonCount.count],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        // Mettre à jour le message
        const buttons = await db.allAsync(
          "SELECT * FROM role_panel_buttons WHERE panel_id = ?",
          [panel.id]
        );

        await updatePanelMessage(client, panel, buttons);

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Bouton ajouté')
          .addFields(
            { name: '📋 Panel', value: name, inline: true },
            { name: '🎭 Rôle', value: `${role}`, inline: true },
            { name: '🏷️ Label', value: label || role.name, inline: true }
          );

        if (emoji) embed.addFields({ name: '😀 Emoji', value: emoji, inline: true });

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      case 'delete': {
        const name = interaction.options.getString('nom');

        if (!name) {
          return interaction.reply({
            content: '❌ Vous devez spécifier le nom du panel à supprimer.',
            ephemeral: true
          });
        }

        const panel = await db.getAsync(
          "SELECT * FROM role_panels WHERE guild_id = ? AND name = ?",
          [guildId, name]
        );

        if (!panel) {
          return interaction.reply({
            content: `❌ Panel "${name}" non trouvé.`,
            ephemeral: true
          });
        }

        // Supprimer le message
        try {
          const channel = interaction.guild.channels.cache.get(panel.channel_id);
          if (channel && panel.message_id) {
            const message = await channel.messages.fetch(panel.message_id).catch(() => null);
            if (message) await message.delete();
          }
        } catch {}

        // Supprimer de la DB
        await new Promise((resolve, reject) => {
          db.run("DELETE FROM role_panel_buttons WHERE panel_id = ?", [panel.id], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        await new Promise((resolve, reject) => {
          db.run("DELETE FROM role_panels WHERE id = ?", [panel.id], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        return interaction.reply({
          content: `✅ Panel **${name}** supprimé avec succès.`,
          ephemeral: true
        });
      }

      case 'list': {
        const panels = await db.allAsync(
          "SELECT rp.*, COUNT(rpb.id) as button_count FROM role_panels rp LEFT JOIN role_panel_buttons rpb ON rp.id = rpb.panel_id WHERE rp.guild_id = ? GROUP BY rp.id",
          [guildId]
        );

        if (!panels || panels.length === 0) {
          return interaction.reply({
            content: 'ℹ️ Aucun panel de rôles configuré. Créez-en un avec `/rolepanel create`.',
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('📋 Panels de rôles')
          .setDescription(panels.map(p => {
            const status = p.enabled ? '🟢' : '🔴';
            return `${status} **${p.name}** - ${p.button_count} boutons - <#${p.channel_id}>`;
          }).join('\n'));

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      case 'refresh': {
        const name = interaction.options.getString('nom');

        if (!name) {
          return interaction.reply({
            content: '❌ Vous devez spécifier le nom du panel à actualiser.',
            ephemeral: true
          });
        }

        const panel = await db.getAsync(
          "SELECT * FROM role_panels WHERE guild_id = ? AND name = ?",
          [guildId, name]
        );

        if (!panel) {
          return interaction.reply({
            content: `❌ Panel "${name}" non trouvé.`,
            ephemeral: true
          });
        }

        const buttons = await db.allAsync(
          "SELECT * FROM role_panel_buttons WHERE panel_id = ?",
          [panel.id]
        );

        const messageId = await updatePanelMessage(client, panel, buttons);

        if (messageId) {
          return interaction.reply({
            content: `✅ Panel **${name}** actualisé !`,
            ephemeral: true
          });
        } else {
          return interaction.reply({
            content: '❌ Erreur lors de l\'actualisation du panel.',
            ephemeral: true
          });
        }
      }
    }
  },

  executePrefix: async (client, message, args) => {
    return message.reply('❌ Cette commande est disponible uniquement en slash command. Utilisez `/rolepanel`.');
  }
});

// Exporter la fonction de mise à jour pour l'API
module.exports.updatePanelMessage = updatePanelMessage;
