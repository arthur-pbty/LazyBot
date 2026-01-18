const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../fonctions/sendLog');

module.exports = {
  name: 'roleUpdate',
  async execute(client, oldRole, newRole) {
    const changes = [];

    // Changement de nom
    if (oldRole.name !== newRole.name) {
      changes.push({ name: '📝 Nom', value: `\`${oldRole.name}\` → \`${newRole.name}\``, inline: false });
    }

    // Changement de couleur
    if (oldRole.hexColor !== newRole.hexColor) {
      changes.push({ name: '🎨 Couleur', value: `${oldRole.hexColor} → ${newRole.hexColor}`, inline: true });
    }

    // Changement hoisted (affiché séparément)
    if (oldRole.hoist !== newRole.hoist) {
      changes.push({ name: '📊 Affiché séparément', value: `${oldRole.hoist ? 'Oui' : 'Non'} → ${newRole.hoist ? 'Oui' : 'Non'}`, inline: true });
    }

    // Changement mentionnable
    if (oldRole.mentionable !== newRole.mentionable) {
      changes.push({ name: '🔔 Mentionnable', value: `${oldRole.mentionable ? 'Oui' : 'Non'} → ${newRole.mentionable ? 'Oui' : 'Non'}`, inline: true });
    }

    // Changement de permissions
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
      const oldPerms = oldRole.permissions.toArray();
      const newPerms = newRole.permissions.toArray();
      
      const addedPerms = newPerms.filter(p => !oldPerms.includes(p));
      const removedPerms = oldPerms.filter(p => !newPerms.includes(p));

      if (addedPerms.length > 0) {
        changes.push({ name: '✅ Permissions ajoutées', value: addedPerms.slice(0, 10).join(', ') + (addedPerms.length > 10 ? '...' : ''), inline: false });
      }
      if (removedPerms.length > 0) {
        changes.push({ name: '❌ Permissions retirées', value: removedPerms.slice(0, 10).join(', ') + (removedPerms.length > 10 ? '...' : ''), inline: false });
      }
    }

    // Si aucun changement détecté, ignorer
    if (changes.length === 0) return;

    let executor = null;

    try {
      const auditLogs = await newRole.guild.fetchAuditLogs({
        type: AuditLogEvent.RoleUpdate,
        limit: 1
      });

      const updateLog = auditLogs.entries.first();
      if (updateLog && updateLog.target.id === newRole.id && (Date.now() - updateLog.createdTimestamp) < 5000) {
        executor = updateLog.executor;
      }
    } catch (err) {
      console.error('Erreur récupération audit logs role update:', err);
    }

    await sendLog(client, newRole.guild.id, 'roles', {
      action: 'update',
      title: '✏️ Rôle modifié',
      description: `Le rôle ${newRole} a été modifié.`,
      fields: changes,
      executor: executor
    });
  }
};
