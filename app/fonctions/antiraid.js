const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');

// Cache pour le tracking
const spamTracker = new Map(); // guildId_oderId -> [timestamps]
const dupeTracker = new Map(); // guildId_oderId -> [{content, timestamp}]
const joinTracker = new Map(); // guildId -> [timestamps]
const warningTracker = new Map(); // guildId_oderId_type -> count

/**
 * Récupère la config anti-raid d'un serveur
 */
async function getConfig(guildId) {
  try {
    return await db.getAsync("SELECT * FROM antiraid_config WHERE guild_id = ?", [guildId]);
  } catch (err) {
    console.error('Erreur récupération config antiraid:', err);
    return null;
  }
}

/**
 * Vérifie si un membre est exclu (rôle ou salon)
 */
function isExcluded(member, channelId, excludeChannels, excludeRoles) {
  try {
    const channels = JSON.parse(excludeChannels || '[]');
    const roles = JSON.parse(excludeRoles || '[]');
    
    if (channels.includes(channelId)) return true;
    if (member && roles.some(roleId => member.roles.cache.has(roleId))) return true;
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Envoie un log dans le salon de logs anti-raid
 */
async function sendLog(client, guildId, config, embed) {
  if (!config.log_channel_id) return;
  
  try {
    const guild = client.guilds.cache.get(guildId);
    const channel = guild?.channels.cache.get(config.log_channel_id);
    if (channel) {
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('Erreur envoi log antiraid:', err);
  }
}

/**
 * Applique une action sur un membre
 */
async function applyAction(member, action, reason, duration = 10) {
  try {
    switch (action) {
      case 'delete':
        // Juste supprimer le message, pas d'action sur le membre
        return 'deleted';
      case 'warn':
        // Avertissement simple
        return 'warned';
      case 'mute':
      case 'timeout':
        await member.timeout(duration * 60 * 1000, reason);
        return 'muted';
      case 'kick':
        await member.kick(reason);
        return 'kicked';
      case 'ban':
        await member.ban({ reason, deleteMessageSeconds: 86400 });
        return 'banned';
      default:
        return 'none';
    }
  } catch (err) {
    console.error('Erreur application action antiraid:', err);
    return 'error';
  }
}

/**
 * Crée un embed de log
 */
function createLogEmbed(type, user, reason, action, details = {}) {
  const colors = {
    link: 0x3498DB,
    invite: 0x9B59B6,
    spam: 0xE74C3C,
    duplicate: 0xE67E22,
    mention: 0xF1C40F,
    emoji: 0x1ABC9C,
    caps: 0x95A5A6,
    newline: 0x2ECC71,
    bot: 0xE91E63,
    massjoin: 0x9B59B6,
    badwords: 0xE74C3C
  };

  const titles = {
    link: '🔗 Anti-Link',
    invite: '📨 Anti-Invite',
    spam: '⚡ Anti-Spam',
    duplicate: '📋 Anti-Duplicate',
    mention: '📢 Anti-Mention',
    emoji: '😀 Anti-Emoji',
    caps: '🔠 Anti-Caps',
    newline: '📄 Anti-Newline',
    bot: '🤖 Anti-Bot',
    massjoin: '👥 Anti-Mass Join',
    badwords: '🤬 Anti-Gros Mots'
  };

  const embed = new EmbedBuilder()
    .setColor(colors[type] || 0xED4245)
    .setTitle(titles[type] || '🛡️ Anti-Raid')
    .setDescription(reason)
    .addFields(
      { name: '👤 Utilisateur', value: `${user} (${user.tag || user.username})`, inline: true },
      { name: '⚡ Action', value: action, inline: true }
    )
    .setThumbnail(user.displayAvatarURL?.({ size: 64 }) || null)
    .setTimestamp();

  if (details.content) {
    embed.addFields({ name: '💬 Contenu', value: details.content.substring(0, 1024), inline: false });
  }
  if (details.channel) {
    embed.addFields({ name: '📁 Salon', value: `<#${details.channel}>`, inline: true });
  }

  return embed;
}

// ===== ANTI-LINK =====
async function checkAntiLink(message, config) {
  if (!config.antilink_enabled) return false;
  if (isExcluded(message.member, message.channel.id, config.antilink_exclude_channels, config.antilink_exclude_roles)) return false;
  if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

  const urlRegex = /https?:\/\/[^\s]+/gi;
  const links = message.content.match(urlRegex);
  if (!links) return false;

  const whitelist = JSON.parse(config.antilink_whitelist_domains || '[]');
  const hasBlockedLink = links.some(link => {
    try {
      const url = new URL(link);
      return !whitelist.some(domain => url.hostname.includes(domain));
    } catch {
      return true;
    }
  });

  if (!hasBlockedLink) return false;

  await message.delete().catch(() => {});
  if (config.antilink_warn_message) {
    const warnMsg = await message.channel.send(`${message.author} ${config.antilink_warn_message}`);
    setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
  }

  const actionResult = await applyAction(message.member, config.antilink_action, 'Anti-Link');
  return { type: 'link', action: actionResult, content: message.content };
}

// ===== ANTI-INVITE =====
async function checkAntiInvite(message, config, client) {
  if (!config.antiinvite_enabled) return false;
  if (isExcluded(message.member, message.channel.id, config.antiinvite_exclude_channels, config.antiinvite_exclude_roles)) return false;
  if (message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) return false;

  const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/gi;
  const invites = message.content.match(inviteRegex);
  if (!invites) return false;

  // Vérifier si c'est une invite de ce serveur
  if (config.antiinvite_allow_own_server) {
    try {
      const guildInvites = await message.guild.invites.fetch();
      const ownInviteCodes = guildInvites.map(i => i.code);
      const hasExternalInvite = invites.some(invite => {
        const code = invite.split('/').pop();
        return !ownInviteCodes.includes(code);
      });
      if (!hasExternalInvite) return false;
    } catch {
      // Si on ne peut pas fetch les invites, bloquer par défaut
    }
  }

  await message.delete().catch(() => {});
  const warnMsg = await message.channel.send(`${message.author} ⚠️ Les invitations Discord ne sont pas autorisées.`);
  setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

  const actionResult = await applyAction(message.member, config.antiinvite_action, 'Anti-Invite');
  return { type: 'invite', action: actionResult, content: message.content };
}

// ===== ANTI-SPAM =====
async function checkAntiSpam(message, config) {
  if (!config.antispam_enabled) return false;
  if (isExcluded(message.member, message.channel.id, config.antispam_exclude_channels, config.antispam_exclude_roles)) return false;
  if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

  const key = `${message.guild.id}_${message.author.id}`;
  const now = Date.now();
  const interval = config.antispam_interval_seconds * 1000;

  if (!spamTracker.has(key)) {
    spamTracker.set(key, []);
  }

  const timestamps = spamTracker.get(key).filter(t => now - t < interval);
  timestamps.push(now);
  spamTracker.set(key, timestamps);

  if (timestamps.length < config.antispam_max_messages) return false;

  // Spam détecté
  spamTracker.delete(key);
  
  // Supprimer les messages récents de l'utilisateur
  try {
    const messages = await message.channel.messages.fetch({ limit: 20 });
    const userMessages = messages.filter(m => m.author.id === message.author.id && now - m.createdTimestamp < interval);
    await message.channel.bulkDelete(userMessages).catch(() => {});
  } catch {}

  const actionResult = await applyAction(message.member, config.antispam_action, 'Anti-Spam', config.antispam_mute_duration_minutes);
  return { type: 'spam', action: actionResult, content: `${timestamps.length} messages en ${config.antispam_interval_seconds}s` };
}

// ===== ANTI-DUPLICATE =====
async function checkAntiDuplicate(message, config) {
  if (!config.antidupe_enabled) return false;
  if (isExcluded(message.member, message.channel.id, config.antidupe_exclude_channels, config.antidupe_exclude_roles)) return false;
  if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;
  if (message.content.length < 5) return false;

  const key = `${message.guild.id}_${message.author.id}`;
  const now = Date.now();
  const interval = config.antidupe_interval_seconds * 1000;

  if (!dupeTracker.has(key)) {
    dupeTracker.set(key, []);
  }

  const history = dupeTracker.get(key).filter(h => now - h.timestamp < interval);
  const duplicates = history.filter(h => h.content === message.content).length;
  
  history.push({ content: message.content, timestamp: now });
  dupeTracker.set(key, history.slice(-20));

  if (duplicates < config.antidupe_max_duplicates - 1) return false;

  await message.delete().catch(() => {});
  const warnMsg = await message.channel.send(`${message.author} ⚠️ Arrêtez de répéter le même message.`);
  setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

  const actionResult = await applyAction(message.member, config.antidupe_action, 'Anti-Duplicate');
  return { type: 'duplicate', action: actionResult, content: message.content };
}

// ===== ANTI-MASS MENTION =====
async function checkAntiMention(message, config) {
  if (!config.antimention_enabled) return false;
  if (isExcluded(message.member, message.channel.id, config.antimention_exclude_channels, config.antimention_exclude_roles)) return false;
  if (message.member?.permissions.has(PermissionFlagsBits.MentionEveryone)) return false;

  const mentionCount = message.mentions.users.size + message.mentions.roles.size;
  if (mentionCount < config.antimention_max_mentions) return false;

  await message.delete().catch(() => {});
  const warnMsg = await message.channel.send(`${message.author} ⚠️ Trop de mentions dans votre message.`);
  setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

  const actionResult = await applyAction(message.member, config.antimention_action, 'Anti-Mass Mention');
  return { type: 'mention', action: actionResult, content: `${mentionCount} mentions` };
}

// ===== ANTI-EMOJI =====
async function checkAntiEmoji(message, config) {
  if (!config.antiemoji_enabled) return false;
  if (isExcluded(message.member, message.channel.id, config.antiemoji_exclude_channels, config.antiemoji_exclude_roles)) return false;
  if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

  const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|<a?:\w+:\d+>)/g;
  const emojis = message.content.match(emojiRegex);
  if (!emojis || emojis.length < config.antiemoji_max_emojis) return false;

  await message.delete().catch(() => {});
  const warnMsg = await message.channel.send(`${message.author} ⚠️ Trop d'emojis dans votre message.`);
  setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

  const actionResult = await applyAction(message.member, config.antiemoji_action, 'Anti-Emoji');
  return { type: 'emoji', action: actionResult, content: `${emojis.length} emojis` };
}

// ===== ANTI-CAPS =====
async function checkAntiCaps(message, config) {
  if (!config.anticaps_enabled) return false;
  if (isExcluded(message.member, message.channel.id, config.anticaps_exclude_channels, config.anticaps_exclude_roles)) return false;
  if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

  const text = message.content.replace(/[^a-zA-Z]/g, '');
  if (text.length < config.anticaps_min_length) return false;

  const capsCount = (text.match(/[A-Z]/g) || []).length;
  const capsPercent = (capsCount / text.length) * 100;

  if (capsPercent < config.anticaps_max_percent) return false;

  await message.delete().catch(() => {});
  const warnMsg = await message.channel.send(`${message.author} ⚠️ Trop de majuscules dans votre message.`);
  setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

  const actionResult = await applyAction(message.member, config.anticaps_action, 'Anti-Caps');
  return { type: 'caps', action: actionResult, content: `${Math.round(capsPercent)}% majuscules` };
}

// ===== ANTI-NEWLINE =====
async function checkAntiNewline(message, config) {
  if (!config.antinewline_enabled) return false;
  if (isExcluded(message.member, message.channel.id, config.antinewline_exclude_channels, config.antinewline_exclude_roles)) return false;
  if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

  const lines = message.content.split('\n').length;
  if (lines < config.antinewline_max_lines) return false;

  await message.delete().catch(() => {});
  const warnMsg = await message.channel.send(`${message.author} ⚠️ Trop de lignes dans votre message.`);
  setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

  const actionResult = await applyAction(message.member, config.antinewline_action, 'Anti-Newline');
  return { type: 'newline', action: actionResult, content: `${lines} lignes` };
}

// ===== ANTI-BADWORDS =====
async function checkAntiBadwords(message, config) {
  if (!config.antibadwords_enabled) return false;
  if (isExcluded(message.member, message.channel.id, config.antibadwords_exclude_channels, config.antibadwords_exclude_roles)) return false;
  if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

  let badwordsList = [];
  try {
    badwordsList = JSON.parse(config.antibadwords_words || '[]');
  } catch {
    return false;
  }

  if (badwordsList.length === 0) return false;

  // Normaliser le message (enlever accents, mettre en minuscules)
  const normalizedContent = message.content
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');

  // Vérifier chaque gros mot
  const foundBadword = badwordsList.find(word => {
    const normalizedWord = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Vérifier le mot entier ou avec des variations
    const regex = new RegExp(`\\b${normalizedWord}\\b|${normalizedWord.split('').join('[^a-z]*')}`, 'i');
    return regex.test(normalizedContent);
  });

  if (!foundBadword) return false;

  await message.delete().catch(() => {});
  if (config.antibadwords_warn_message) {
    const warnMsg = await message.channel.send(`${message.author} ${config.antibadwords_warn_message}`);
    setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
  }

  const actionResult = await applyAction(message.member, config.antibadwords_action, 'Anti-Gros Mots');
  return { type: 'badwords', action: actionResult, content: '[Contenu censuré]' };
}

// ===== ANTI-BOT JOIN =====
async function checkAntiBot(member, config) {
  if (!config.antibot_enabled) return false;
  
  const now = Date.now();
  const accountAge = Math.floor((now - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
  const reasons = [];

  // Compte trop récent
  if (accountAge < config.antibot_min_account_age_days) {
    reasons.push(`Compte créé il y a ${accountAge} jours (min: ${config.antibot_min_account_age_days})`);
  }

  // Pas d'avatar
  if (config.antibot_no_avatar_action && !member.user.avatar) {
    reasons.push('Pas d\'avatar');
  }

  // Nom suspect (caractères bizarres, pattern de bot)
  if (config.antibot_suspicious_name_action) {
    const suspiciousPattern = /^[a-z]{4,8}\d{4}$/i; // Pattern comme "user1234"
    const weirdChars = /[\u200B-\u200D\uFEFF]/; // Caractères invisibles
    if (suspiciousPattern.test(member.user.username) || weirdChars.test(member.user.username)) {
      reasons.push('Nom suspect');
    }
  }

  if (reasons.length === 0) return false;

  const actionResult = await applyAction(member, config.antibot_action, 'Anti-Bot: ' + reasons.join(', '));
  return { type: 'bot', action: actionResult, reasons };
}

// ===== ANTI-MASS JOIN =====
async function checkAntiMassJoin(member, config) {
  if (!config.antimassj_enabled) return false;

  const guildId = member.guild.id;
  const now = Date.now();
  const interval = config.antimassj_interval_seconds * 1000;

  if (!joinTracker.has(guildId)) {
    joinTracker.set(guildId, []);
  }

  const joins = joinTracker.get(guildId).filter(t => now - t < interval);
  joins.push(now);
  joinTracker.set(guildId, joins);

  if (joins.length < config.antimassj_max_joins) return false;

  // Raid détecté - appliquer l'action sur ce membre
  const actionResult = await applyAction(member, config.antimassj_action, 'Anti-Mass Join: Raid détecté');
  
  return { type: 'massjoin', action: actionResult, joinCount: joins.length };
}

/**
 * Vérifie tous les filtres anti-raid pour un message
 */
async function checkMessage(message, client) {
  if (!message.guild) return;
  if (message.author.bot) return;

  const config = await getConfig(message.guild.id);
  if (!config || !config.enabled) return;

  // Vérifier chaque filtre
  const checks = [
    checkAntiLink(message, config),
    checkAntiInvite(message, config, client),
    checkAntiSpam(message, config),
    checkAntiDuplicate(message, config),
    checkAntiMention(message, config),
    checkAntiEmoji(message, config),
    checkAntiCaps(message, config),
    checkAntiNewline(message, config),
    checkAntiBadwords(message, config)
  ];

  for (const check of checks) {
    const result = await check;
    if (result) {
      // Toujours ajouter un warn automatique lors d'une violation anti-raid
      await addAutoWarn(message.guild.id, message.author.id, client.user.id, `Anti-Raid: ${result.type}`, result.type, client);
      
      const embed = createLogEmbed(result.type, message.author, `Violation détectée`, result.action, {
        content: result.content,
        channel: message.channel.id
      });
      await sendLog(client, message.guild.id, config, embed);
      break; // Une seule action par message
    }
  }
}

/**
 * Ajoute un warn automatique et vérifie les sanctions
 */
async function addAutoWarn(guildId, userId, moderatorId, reason, source, client) {
  try {
    // Ajouter le warn
    await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO warnings (guild_id, user_id, moderator_id, reason, source) VALUES (?, ?, ?, ?, ?)",
        [guildId, userId, moderatorId, reason, source],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Vérifier les sanctions automatiques
    await checkWarningSanctions(guildId, userId, client);
  } catch (err) {
    console.error('Erreur ajout auto warn:', err);
  }
}

/**
 * Vérifie et applique les sanctions automatiques basées sur le nombre de warns
 */
async function checkWarningSanctions(guildId, userId, client) {
  try {
    // Récupérer la config des warns
    const warnConfig = await db.getAsync("SELECT * FROM warnings_config WHERE guild_id = ?", [guildId]);
    if (!warnConfig || !warnConfig.enabled) return;

    // Compter les warns actifs (avec decay si activé)
    let countQuery = "SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?";
    const params = [guildId, userId];
    
    if (warnConfig.decay_enabled && warnConfig.decay_days > 0) {
      const decayTimestamp = Math.floor(Date.now() / 1000) - (warnConfig.decay_days * 86400);
      countQuery += " AND created_at > ?";
      params.push(decayTimestamp);
    }

    const result = await db.getAsync(countQuery, params);
    const warnCount = result.count;

    // Déterminer l'action à appliquer
    let action = 'none';
    let duration = 0;

    if (warnCount >= 5 && warnConfig.warn5_action !== 'none') {
      action = warnConfig.warn5_action;
      duration = warnConfig.warn5_duration;
    } else if (warnCount >= 4 && warnConfig.warn4_action !== 'none') {
      action = warnConfig.warn4_action;
      duration = warnConfig.warn4_duration;
    } else if (warnCount >= 3 && warnConfig.warn3_action !== 'none') {
      action = warnConfig.warn3_action;
      duration = warnConfig.warn3_duration;
    } else if (warnCount >= 2 && warnConfig.warn2_action !== 'none') {
      action = warnConfig.warn2_action;
      duration = warnConfig.warn2_duration;
    } else if (warnCount >= 1 && warnConfig.warn1_action !== 'none') {
      action = warnConfig.warn1_action;
      duration = warnConfig.warn1_duration;
    }

    if (action === 'none') return;

    // Appliquer la sanction
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    const reason = `Sanction automatique: ${warnCount} avertissement(s)`;

    switch (action) {
      case 'mute':
        await member.timeout(duration * 60 * 1000, reason).catch(() => {});
        break;
      case 'kick':
        await member.kick(reason).catch(() => {});
        break;
      case 'ban':
        await member.ban({ reason, deleteMessageSeconds: 86400 }).catch(() => {});
        break;
    }

    // Notifier si configuré
    if (warnConfig.notify_channel_id) {
      const channel = guild.channels.cache.get(warnConfig.notify_channel_id);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('⚠️ Sanction automatique')
          .setDescription(`**${member.user.tag}** a reçu une sanction automatique.`)
          .addFields(
            { name: '👤 Utilisateur', value: `${member}`, inline: true },
            { name: '📊 Avertissements', value: `${warnCount}`, inline: true },
            { name: '⚡ Action', value: action, inline: true }
          )
          .setTimestamp();
        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }

  } catch (err) {
    console.error('Erreur check warning sanctions:', err);
  }
}

/**
 * Vérifie les filtres anti-raid pour un nouveau membre
 */
async function checkMemberJoin(member, client) {
  if (member.user.bot) return;

  const config = await getConfig(member.guild.id);
  if (!config || !config.enabled) return;

  // Anti-bot
  const botResult = await checkAntiBot(member, config);
  if (botResult) {
    // Ajouter un warn automatique
    await addAutoWarn(member.guild.id, member.user.id, client.user.id, `Anti-Raid: Compte suspect (${botResult.reasons.join(', ')})`, 'antibot', client);
    
    const embed = createLogEmbed('bot', member.user, `Compte suspect détecté: ${botResult.reasons.join(', ')}`, botResult.action);
    await sendLog(client, member.guild.id, config, embed);
  }

  // Anti-mass join
  const massJoinResult = await checkAntiMassJoin(member, config);
  if (massJoinResult) {
    // Ajouter un warn automatique
    await addAutoWarn(member.guild.id, member.user.id, client.user.id, `Anti-Raid: Mass join détecté`, 'massjoin', client);
    
    const embed = createLogEmbed('massjoin', member.user, `Raid potentiel détecté: ${massJoinResult.joinCount} joins rapides`, massJoinResult.action);
    await sendLog(client, member.guild.id, config, embed);
  }
}

// Nettoyage périodique des trackers
setInterval(() => {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  for (const [key, timestamps] of spamTracker) {
    const filtered = timestamps.filter(t => now - t < maxAge);
    if (filtered.length === 0) spamTracker.delete(key);
    else spamTracker.set(key, filtered);
  }

  for (const [key, history] of dupeTracker) {
    const filtered = history.filter(h => now - h.timestamp < maxAge);
    if (filtered.length === 0) dupeTracker.delete(key);
    else dupeTracker.set(key, filtered);
  }

  for (const [key, joins] of joinTracker) {
    const filtered = joins.filter(t => now - t < maxAge);
    if (filtered.length === 0) joinTracker.delete(key);
    else joinTracker.set(key, filtered);
  }
}, 60000);

module.exports = {
  getConfig,
  checkMessage,
  checkMemberJoin,
  createLogEmbed,
  sendLog,
  addAutoWarn,
  checkWarningSanctions
};
