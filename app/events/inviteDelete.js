const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../fonctions/sendLog');

module.exports = {
  name: 'inviteDelete',
  async execute(client, invite) {
    if (!invite.guild) return;

    let executor = null;

    try {
      const auditLogs = await invite.guild.fetchAuditLogs({
        type: AuditLogEvent.InviteDelete,
        limit: 1
      });

      const deleteLog = auditLogs.entries.first();
      if (deleteLog && deleteLog.target.code === invite.code && (Date.now() - deleteLog.createdTimestamp) < 5000) {
        executor = deleteLog.executor;
      }
    } catch (err) {
      console.error('Erreur récupération audit logs invite delete:', err);
    }

    const fields = [
      { name: '🔗 Code', value: invite.code, inline: true },
      { name: '📁 Salon', value: invite.channel ? `#${invite.channel.name}` : 'Inconnu', inline: true }
    ];

    if (invite.uses !== null && invite.uses !== undefined) {
      fields.push({ name: '📊 Utilisations', value: invite.uses.toString(), inline: true });
    }

    await sendLog(client, invite.guild.id, 'invites', {
      action: 'delete',
      title: '🗑️ Invitation supprimée',
      description: `L'invitation **discord.gg/${invite.code}** a été supprimée.`,
      fields: fields,
      executor: executor
    });
  }
};
