const { AuditLogEvent, ChannelType } = require('discord.js');
const { sendLog } = require('../fonctions/sendLog');

const CHANNEL_TYPE_NAMES = {
  [ChannelType.GuildText]: 'Salon textuel',
  [ChannelType.GuildVoice]: 'Salon vocal',
  [ChannelType.GuildCategory]: 'Catégorie',
  [ChannelType.GuildAnnouncement]: 'Salon d\'annonces',
  [ChannelType.GuildStageVoice]: 'Salon de conférence',
  [ChannelType.GuildForum]: 'Forum',
  [ChannelType.GuildMedia]: 'Salon média'
};

module.exports = {
  name: 'channelDelete',
  async execute(client, channel) {
    if (!channel.guild) return;

    let executor = null;

    try {
      const auditLogs = await channel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelDelete,
        limit: 1
      });

      const deleteLog = auditLogs.entries.first();
      if (deleteLog && deleteLog.target.id === channel.id && (Date.now() - deleteLog.createdTimestamp) < 5000) {
        executor = deleteLog.executor;
      }
    } catch (err) {
      console.error('Erreur récupération audit logs channel delete:', err);
    }

    const typeName = CHANNEL_TYPE_NAMES[channel.type] || 'Salon';
    const fields = [
      { name: '📁 Nom', value: channel.name, inline: true },
      { name: '🏷️ Type', value: typeName, inline: true },
      { name: '🆔 ID', value: channel.id, inline: true }
    ];

    if (channel.parent) {
      fields.push({ name: '📂 Catégorie', value: channel.parent.name, inline: true });
    }

    await sendLog(client, channel.guild.id, 'channels', {
      action: 'delete',
      title: '🗑️ Salon supprimé',
      description: `Le salon **#${channel.name}** a été supprimé.`,
      fields: fields,
      executor: executor
    });
  }
};
