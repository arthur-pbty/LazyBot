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
  name: 'channelCreate',
  async execute(client, channel) {
    if (!channel.guild) return;

    let executor = null;

    try {
      const auditLogs = await channel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelCreate,
        limit: 1
      });

      const createLog = auditLogs.entries.first();
      if (createLog && createLog.target.id === channel.id && (Date.now() - createLog.createdTimestamp) < 5000) {
        executor = createLog.executor;
      }
    } catch (err) {
      console.error('Erreur récupération audit logs channel create:', err);
    }

    const typeName = CHANNEL_TYPE_NAMES[channel.type] || 'Salon';
    const fields = [
      { name: '📁 Nom', value: channel.name, inline: true },
      { name: '🏷️ Type', value: typeName, inline: true }
    ];

    if (channel.parent) {
      fields.push({ name: '📂 Catégorie', value: channel.parent.name, inline: true });
    }

    await sendLog(client, channel.guild.id, 'channels', {
      action: 'create',
      title: '✅ Salon créé',
      description: `Le salon ${channel} a été créé.`,
      fields: fields,
      executor: executor
    });
  }
};
