const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../fonctions/sendLog');

module.exports = {
  name: 'channelUpdate',
  async execute(client, oldChannel, newChannel) {
    if (!newChannel.guild) return;

    const changes = [];

    // Changement de nom
    if (oldChannel.name !== newChannel.name) {
      changes.push({ name: '📝 Nom', value: `\`${oldChannel.name}\` → \`${newChannel.name}\``, inline: false });
    }

    // Changement de topic (description)
    if (oldChannel.topic !== newChannel.topic) {
      const oldTopic = oldChannel.topic || '*Aucun*';
      const newTopic = newChannel.topic || '*Aucun*';
      changes.push({ name: '📄 Description', value: `${oldTopic.substring(0, 100)} → ${newTopic.substring(0, 100)}`, inline: false });
    }

    // Changement de catégorie
    if (oldChannel.parentId !== newChannel.parentId) {
      const oldParent = oldChannel.parent?.name || '*Aucune*';
      const newParent = newChannel.parent?.name || '*Aucune*';
      changes.push({ name: '📂 Catégorie', value: `${oldParent} → ${newParent}`, inline: false });
    }

    // Changement de slowmode
    if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
      const formatSlowmode = (seconds) => {
        if (seconds === 0) return 'Désactivé';
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        return `${Math.floor(seconds / 3600)}h`;
      };
      changes.push({ 
        name: '🐌 Slowmode', 
        value: `${formatSlowmode(oldChannel.rateLimitPerUser)} → ${formatSlowmode(newChannel.rateLimitPerUser)}`, 
        inline: true 
      });
    }

    // Changement NSFW
    if (oldChannel.nsfw !== newChannel.nsfw) {
      changes.push({ name: '🔞 NSFW', value: `${oldChannel.nsfw ? 'Oui' : 'Non'} → ${newChannel.nsfw ? 'Oui' : 'Non'}`, inline: true });
    }

    // Si aucun changement détecté, ignorer
    if (changes.length === 0) return;

    let executor = null;

    try {
      const auditLogs = await newChannel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelUpdate,
        limit: 1
      });

      const updateLog = auditLogs.entries.first();
      if (updateLog && updateLog.target.id === newChannel.id && (Date.now() - updateLog.createdTimestamp) < 5000) {
        executor = updateLog.executor;
      }
    } catch (err) {
      console.error('Erreur récupération audit logs channel update:', err);
    }

    await sendLog(client, newChannel.guild.id, 'channels', {
      action: 'update',
      title: '✏️ Salon modifié',
      description: `Le salon ${newChannel} a été modifié.`,
      fields: changes,
      executor: executor
    });
  }
};
