const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../fonctions/sendLog');

module.exports = {
  name: 'roleCreate',
  async execute(client, role) {
    let executor = null;

    try {
      const auditLogs = await role.guild.fetchAuditLogs({
        type: AuditLogEvent.RoleCreate,
        limit: 1
      });

      const createLog = auditLogs.entries.first();
      if (createLog && createLog.target.id === role.id && (Date.now() - createLog.createdTimestamp) < 5000) {
        executor = createLog.executor;
      }
    } catch (err) {
      console.error('Erreur récupération audit logs role create:', err);
    }

    await sendLog(client, role.guild.id, 'roles', {
      action: 'create',
      title: '✅ Rôle créé',
      description: `Le rôle ${role} a été créé.`,
      fields: [
        { name: '🎭 Nom', value: role.name, inline: true },
        { name: '🎨 Couleur', value: role.hexColor || '#000000', inline: true },
        { name: '🆔 ID', value: role.id, inline: true }
      ],
      executor: executor
    });
  }
};
