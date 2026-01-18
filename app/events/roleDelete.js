const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../fonctions/sendLog');

module.exports = {
  name: 'roleDelete',
  async execute(client, role) {
    let executor = null;

    try {
      const auditLogs = await role.guild.fetchAuditLogs({
        type: AuditLogEvent.RoleDelete,
        limit: 1
      });

      const deleteLog = auditLogs.entries.first();
      if (deleteLog && deleteLog.target.id === role.id && (Date.now() - deleteLog.createdTimestamp) < 5000) {
        executor = deleteLog.executor;
      }
    } catch (err) {
      console.error('Erreur récupération audit logs role delete:', err);
    }

    await sendLog(client, role.guild.id, 'roles', {
      action: 'delete',
      title: '🗑️ Rôle supprimé',
      description: `Le rôle **@${role.name}** a été supprimé.`,
      fields: [
        { name: '🎭 Nom', value: role.name, inline: true },
        { name: '🎨 Couleur', value: role.hexColor || '#000000', inline: true },
        { name: '🆔 ID', value: role.id, inline: true }
      ],
      executor: executor
    });
  }
};
