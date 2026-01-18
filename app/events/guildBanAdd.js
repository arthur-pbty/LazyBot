const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../fonctions/sendLog');

module.exports = {
  name: 'guildBanAdd',
  async execute(client, ban) {
    const { guild, user } = ban;

    // Essayer de récupérer l'exécuteur depuis les audit logs
    let executor = null;
    let reason = 'Aucune raison spécifiée';

    try {
      const auditLogs = await guild.fetchAuditLogs({
        type: AuditLogEvent.MemberBan,
        limit: 1
      });

      const banLog = auditLogs.entries.first();
      if (banLog && banLog.target.id === user.id && (Date.now() - banLog.createdTimestamp) < 5000) {
        executor = banLog.executor;
        reason = banLog.reason || reason;
      }
    } catch (err) {
      console.error('Erreur récupération audit logs ban:', err);
    }

    await sendLog(client, guild.id, 'moderation', {
      action: 'ban',
      title: '🔨 Membre banni',
      description: `**${user.tag}** a été banni du serveur.`,
      fields: [
        { name: '👤 Utilisateur', value: `${user} (${user.id})`, inline: true },
        { name: '📝 Raison', value: reason, inline: false }
      ],
      thumbnail: user.displayAvatarURL({ size: 128 }),
      user: user,
      executor: executor
    });
  }
};
