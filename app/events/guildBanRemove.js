const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../fonctions/sendLog');

module.exports = {
  name: 'guildBanRemove',
  async execute(client, ban) {
    const { guild, user } = ban;

    // Essayer de récupérer l'exécuteur depuis les audit logs
    let executor = null;

    try {
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.MemberBanRemove,
        limit: 1
      });

      const unbanLog = auditLogs.entries.first();
      if (unbanLog && unbanLog.target.id === user.id && (Date.now() - unbanLog.createdTimestamp) < 5000) {
        executor = unbanLog.executor;
      }
    } catch (err) {
      console.error('Erreur récupération audit logs unban:', err);
    }

    await sendLog(client, guild.id, 'moderation', {
      action: 'unban',
      title: '🔓 Membre débanni',
      description: `**${user.tag}** a été débanni du serveur.`,
      fields: [
        { name: '👤 Utilisateur', value: `${user} (${user.id})`, inline: true }
      ],
      thumbnail: user.displayAvatarURL({ size: 128 }),
      user: user,
      executor: executor
    });
  }
};
