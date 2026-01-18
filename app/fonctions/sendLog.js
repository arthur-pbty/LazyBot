const { EmbedBuilder } = require('discord.js');
const db = require('../db');

/**
 * Couleurs pour les différents types d'actions
 */
const COLORS = {
  // Actions positives (vert)
  create: 0x57F287,
  join: 0x57F287,
  add: 0x57F287,
  unban: 0x57F287,
  untimeout: 0x57F287,

  // Actions neutres (bleu)
  update: 0x5865F2,
  edit: 0x5865F2,
  move: 0x5865F2,
  change: 0x5865F2,

  // Actions négatives (rouge)
  delete: 0xED4245,
  leave: 0xED4245,
  remove: 0xED4245,
  ban: 0xED4245,
  kick: 0xED4245,
  timeout: 0xED4245,

  // Avertissements (orange)
  warn: 0xF0B232,
  warning: 0xF0B232
};

/**
 * Envoie un log dans le salon approprié
 * @param {Client} client - Le client Discord
 * @param {string} guildId - L'ID du serveur
 * @param {string} logType - Le type de log (moderation, voice, messages, members, channels, roles, invites, server)
 * @param {object} options - Les options de l'embed
 * @param {string} options.action - L'action effectuée (create, delete, update, join, leave, etc.)
 * @param {string} options.title - Le titre de l'embed
 * @param {string} [options.description] - La description de l'embed
 * @param {Array} [options.fields] - Les champs de l'embed
 * @param {string} [options.thumbnail] - URL de la miniature
 * @param {string} [options.image] - URL de l'image
 * @param {User|GuildMember} [options.user] - L'utilisateur concerné
 * @param {User|GuildMember} [options.executor] - L'utilisateur qui a effectué l'action
 */
async function sendLog(client, guildId, logType, options) {
  try {
    // Récupérer la config des logs
    const config = await db.getAsync(
      "SELECT * FROM logs_config WHERE guild_id = ?",
      [guildId]
    );

    // Vérifier si les logs sont activés
    if (!config || !config.enabled) return;

    // Vérifier si ce type de log est activé
    const typeEnabledField = `${logType}_enabled`;
    const typeChannelField = `${logType}_channel_id`;

    if (!config[typeEnabledField]) return;

    const channelId = config[typeChannelField];
    if (!channelId) return;

    // Récupérer le salon
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return;

    // Déterminer la couleur
    const color = COLORS[options.action] || 0x5865F2;

    // Créer l'embed
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(options.title)
      .setTimestamp();

    if (options.description) {
      embed.setDescription(options.description);
    }

    if (options.fields && options.fields.length > 0) {
      embed.addFields(options.fields);
    }

    if (options.thumbnail) {
      embed.setThumbnail(options.thumbnail);
    }

    if (options.image) {
      embed.setImage(options.image);
    }

    // Ajouter l'utilisateur concerné dans le footer si disponible
    if (options.user) {
      const user = options.user.user || options.user;
      embed.setFooter({
        text: `ID: ${user.id}`,
        iconURL: user.displayAvatarURL({ size: 32 })
      });
    }

    // Ajouter l'exécuteur si disponible
    if (options.executor) {
      const executor = options.executor.user || options.executor;
      embed.addFields({
        name: '👤 Exécuté par',
        value: `${executor} (${executor.tag || executor.username})`,
        inline: true
      });
    }

    // Envoyer le log
    await channel.send({ embeds: [embed] });

  } catch (err) {
    console.error(`Erreur envoi log ${logType}:`, err);
  }
}

/**
 * Récupère la config des logs pour un serveur
 * @param {string} guildId - L'ID du serveur
 * @returns {Promise<object|null>}
 */
async function getLogsConfig(guildId) {
  try {
    return await db.getAsync(
      "SELECT * FROM logs_config WHERE guild_id = ?",
      [guildId]
    );
  } catch (err) {
    console.error('Erreur récupération config logs:', err);
    return null;
  }
}

/**
 * Vérifie si un type de log est activé
 * @param {string} guildId - L'ID du serveur
 * @param {string} logType - Le type de log
 * @returns {Promise<boolean>}
 */
async function isLogEnabled(guildId, logType) {
  const config = await getLogsConfig(guildId);
  if (!config || !config.enabled) return false;
  return !!config[`${logType}_enabled`];
}

module.exports = {
  sendLog,
  getLogsConfig,
  isLogEnabled,
  COLORS
};
