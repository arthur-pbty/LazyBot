const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../fonctions/sendLog');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(client, oldMember, newMember) {
    const guild = newMember.guild;

    // Vérifier les changements de rôles
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    const addedRoles = newRoles.filter(role => !oldRoles.has(role.id));
    const removedRoles = oldRoles.filter(role => !newRoles.has(role.id));

    // Log des rôles ajoutés
    if (addedRoles.size > 0) {
      let executor = null;

      try {
        const auditLogs = await guild.fetchAuditLogs({
          type: AuditLogEvent.MemberRoleUpdate,
          limit: 1
        });

        const roleLog = auditLogs.entries.first();
        if (roleLog && roleLog.target.id === newMember.id && (Date.now() - roleLog.createdTimestamp) < 5000) {
          executor = roleLog.executor;
        }
      } catch (err) {
        console.error('Erreur récupération audit logs role:', err);
      }

      await sendLog(client, guild.id, 'members', {
        action: 'add',
        title: '✅ Rôle(s) ajouté(s)',
        description: `**${newMember.user.tag}** a reçu de nouveaux rôles.`,
        fields: [
          { name: '👤 Membre', value: `${newMember} (${newMember.user.tag})`, inline: true },
          { name: '🎭 Rôle(s)', value: addedRoles.map(r => r.toString()).join(', '), inline: false }
        ],
        thumbnail: newMember.user.displayAvatarURL({ size: 128 }),
        user: newMember.user,
        executor: executor
      });
    }

    // Log des rôles retirés
    if (removedRoles.size > 0) {
      let executor = null;

      try {
        const auditLogs = await guild.fetchAuditLogs({
          type: AuditLogEvent.MemberRoleUpdate,
          limit: 1
        });

        const roleLog = auditLogs.entries.first();
        if (roleLog && roleLog.target.id === newMember.id && (Date.now() - roleLog.createdTimestamp) < 5000) {
          executor = roleLog.executor;
        }
      } catch (err) {
        console.error('Erreur récupération audit logs role:', err);
      }

      await sendLog(client, guild.id, 'members', {
        action: 'remove',
        title: '❌ Rôle(s) retiré(s)',
        description: `**${newMember.user.tag}** a perdu des rôles.`,
        fields: [
          { name: '👤 Membre', value: `${newMember} (${newMember.user.tag})`, inline: true },
          { name: '🎭 Rôle(s)', value: removedRoles.map(r => r.toString()).join(', '), inline: false }
        ],
        thumbnail: newMember.user.displayAvatarURL({ size: 128 }),
        user: newMember.user,
        executor: executor
      });
    }

    // Vérifier les changements de pseudo
    if (oldMember.nickname !== newMember.nickname) {
      let executor = null;

      try {
        const auditLogs = await guild.fetchAuditLogs({
          type: AuditLogEvent.MemberUpdate,
          limit: 1
        });

        const nicknameLog = auditLogs.entries.first();
        if (nicknameLog && nicknameLog.target.id === newMember.id && (Date.now() - nicknameLog.createdTimestamp) < 5000) {
          executor = nicknameLog.executor;
        }
      } catch (err) {
        console.error('Erreur récupération audit logs nickname:', err);
      }

      await sendLog(client, guild.id, 'members', {
        action: 'change',
        title: '📝 Pseudo modifié',
        fields: [
          { name: '👤 Membre', value: `${newMember} (${newMember.user.tag})`, inline: true },
          { name: '📝 Ancien pseudo', value: oldMember.nickname || '*Aucun*', inline: true },
          { name: '📝 Nouveau pseudo', value: newMember.nickname || '*Aucun*', inline: true }
        ],
        thumbnail: newMember.user.displayAvatarURL({ size: 128 }),
        user: newMember.user,
        executor: executor
      });
    }

    // Vérifier les timeouts
    const oldTimeout = oldMember.communicationDisabledUntil;
    const newTimeout = newMember.communicationDisabledUntil;

    if (!oldTimeout && newTimeout) {
      // Membre mis en timeout
      let executor = null;
      let reason = 'Aucune raison spécifiée';

      try {
        const auditLogs = await guild.fetchAuditLogs({
          type: AuditLogEvent.MemberUpdate,
          limit: 1
        });

        const timeoutLog = auditLogs.entries.first();
        if (timeoutLog && timeoutLog.target.id === newMember.id && (Date.now() - timeoutLog.createdTimestamp) < 5000) {
          executor = timeoutLog.executor;
          reason = timeoutLog.reason || reason;
        }
      } catch (err) {
        console.error('Erreur récupération audit logs timeout:', err);
      }

      await sendLog(client, guild.id, 'moderation', {
        action: 'timeout',
        title: '⏰ Membre mis en timeout',
        description: `**${newMember.user.tag}** a été mis en timeout.`,
        fields: [
          { name: '👤 Membre', value: `${newMember} (${newMember.user.tag})`, inline: true },
          { name: '⏱️ Expire', value: `<t:${Math.floor(newTimeout.getTime() / 1000)}:R>`, inline: true },
          { name: '📝 Raison', value: reason, inline: false }
        ],
        thumbnail: newMember.user.displayAvatarURL({ size: 128 }),
        user: newMember.user,
        executor: executor
      });
    } else if (oldTimeout && !newTimeout) {
      // Timeout retiré
      let executor = null;

      try {
        const auditLogs = await guild.fetchAuditLogs({
          type: AuditLogEvent.MemberUpdate,
          limit: 1
        });

        const timeoutLog = auditLogs.entries.first();
        if (timeoutLog && timeoutLog.target.id === newMember.id && (Date.now() - timeoutLog.createdTimestamp) < 5000) {
          executor = timeoutLog.executor;
        }
      } catch (err) {
        console.error('Erreur récupération audit logs untimeout:', err);
      }

      await sendLog(client, guild.id, 'moderation', {
        action: 'untimeout',
        title: '✅ Timeout retiré',
        description: `Le timeout de **${newMember.user.tag}** a été retiré.`,
        fields: [
          { name: '👤 Membre', value: `${newMember} (${newMember.user.tag})`, inline: true }
        ],
        thumbnail: newMember.user.displayAvatarURL({ size: 128 }),
        user: newMember.user,
        executor: executor
      });
    }
  }
};
