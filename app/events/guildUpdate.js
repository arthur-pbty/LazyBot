const { AuditLogEvent } = require('discord.js');
const { sendLog } = require('../fonctions/sendLog');

module.exports = {
  name: 'guildUpdate',
  async execute(client, oldGuild, newGuild) {
    const changes = [];

    // Changement de nom
    if (oldGuild.name !== newGuild.name) {
      changes.push({ name: '📝 Nom', value: `\`${oldGuild.name}\` → \`${newGuild.name}\``, inline: false });
    }

    // Changement d'icône
    if (oldGuild.icon !== newGuild.icon) {
      changes.push({ name: '🖼️ Icône', value: 'L\'icône du serveur a été modifiée', inline: false });
    }

    // Changement de bannière
    if (oldGuild.banner !== newGuild.banner) {
      changes.push({ name: '🎨 Bannière', value: 'La bannière du serveur a été modifiée', inline: false });
    }

    // Changement de description
    if (oldGuild.description !== newGuild.description) {
      const oldDesc = oldGuild.description || '*Aucune*';
      const newDesc = newGuild.description || '*Aucune*';
      changes.push({ name: '📄 Description', value: `${oldDesc.substring(0, 100)} → ${newDesc.substring(0, 100)}`, inline: false });
    }

    // Changement de région/locale
    if (oldGuild.preferredLocale !== newGuild.preferredLocale) {
      changes.push({ name: '🌍 Langue', value: `${oldGuild.preferredLocale} → ${newGuild.preferredLocale}`, inline: true });
    }

    // Changement du salon AFK
    if (oldGuild.afkChannelId !== newGuild.afkChannelId) {
      const oldChannel = oldGuild.afkChannel?.name || '*Aucun*';
      const newChannel = newGuild.afkChannel?.name || '*Aucun*';
      changes.push({ name: '💤 Salon AFK', value: `${oldChannel} → ${newChannel}`, inline: true });
    }

    // Changement du timeout AFK
    if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
      const formatTimeout = (seconds) => `${Math.floor(seconds / 60)} minutes`;
      changes.push({ name: '⏰ Timeout AFK', value: `${formatTimeout(oldGuild.afkTimeout)} → ${formatTimeout(newGuild.afkTimeout)}`, inline: true });
    }

    // Changement du niveau de vérification
    if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
      const levels = ['Aucun', 'Faible', 'Moyen', 'Élevé', 'Très élevé'];
      changes.push({ name: '🛡️ Niveau de vérification', value: `${levels[oldGuild.verificationLevel]} → ${levels[newGuild.verificationLevel]}`, inline: true });
    }

    // Changement du filtre de contenu explicite
    if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
      const filters = ['Désactivé', 'Membres sans rôle', 'Tous les membres'];
      changes.push({ name: '🔞 Filtre de contenu', value: `${filters[oldGuild.explicitContentFilter]} → ${filters[newGuild.explicitContentFilter]}`, inline: true });
    }

    // Changement du salon système
    if (oldGuild.systemChannelId !== newGuild.systemChannelId) {
      const oldChannel = oldGuild.systemChannel?.name || '*Aucun*';
      const newChannel = newGuild.systemChannel?.name || '*Aucun*';
      changes.push({ name: '📢 Salon système', value: `#${oldChannel} → #${newChannel}`, inline: true });
    }

    // Changement du propriétaire
    if (oldGuild.ownerId !== newGuild.ownerId) {
      changes.push({ name: '👑 Propriétaire', value: `<@${oldGuild.ownerId}> → <@${newGuild.ownerId}>`, inline: false });
    }

    // Si aucun changement détecté, ignorer
    if (changes.length === 0) return;

    let executor = null;

    try {
      const auditLogs = await newGuild.fetchAuditLogs({
        type: AuditLogEvent.GuildUpdate,
        limit: 1
      });

      const updateLog = auditLogs.entries.first();
      if (updateLog && (Date.now() - updateLog.createdTimestamp) < 5000) {
        executor = updateLog.executor;
      }
    } catch (err) {
      console.error('Erreur récupération audit logs guild update:', err);
    }

    await sendLog(client, newGuild.id, 'server', {
      action: 'update',
      title: '⚙️ Serveur modifié',
      description: `Les paramètres du serveur ont été modifiés.`,
      fields: changes,
      thumbnail: newGuild.iconURL({ size: 128 }),
      executor: executor
    });
  }
};
