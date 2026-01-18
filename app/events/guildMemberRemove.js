const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const db = require("../db");
const { sendLog } = require("../fonctions/sendLog");

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(client, member) {
    // ===== VÉRIFIER SI C'EST UN KICK =====
    let wasKicked = false;
    let kickExecutor = null;
    let kickReason = null;

    try {
      const auditLogs = await member.guild.fetchAuditLogs({
        type: AuditLogEvent.MemberKick,
        limit: 1
      });

      const kickLog = auditLogs.entries.first();
      if (kickLog && kickLog.target.id === member.id && (Date.now() - kickLog.createdTimestamp) < 5000) {
        wasKicked = true;
        kickExecutor = kickLog.executor;
        kickReason = kickLog.reason || 'Aucune raison spécifiée';
      }
    } catch (err) {
      // Pas de permission audit logs
    }

    if (wasKicked) {
      // ===== LOG KICK =====
      await sendLog(client, member.guild.id, 'moderation', {
        action: 'kick',
        title: '👢 Membre expulsé',
        description: `**${member.user.tag}** a été expulsé du serveur.`,
        fields: [
          { name: '👤 Membre', value: `${member.user} (${member.user.tag})`, inline: true },
          { name: '📝 Raison', value: kickReason, inline: false }
        ],
        thumbnail: member.user.displayAvatarURL({ size: 128 }),
        user: member.user,
        executor: kickExecutor
      });
    } else {
      // ===== LOG MEMBRE PARTI =====
      const joinedAt = member.joinedTimestamp ? 
        `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Inconnu';

      await sendLog(client, member.guild.id, 'members', {
        action: 'leave',
        title: '📤 Membre parti',
        description: `**${member.user.tag}** a quitté le serveur.`,
        fields: [
          { name: '👤 Membre', value: `${member.user} (${member.user.tag})`, inline: true },
          { name: '📊 Membres', value: `${member.guild.memberCount}`, inline: true },
          { name: '📅 Avait rejoint', value: joinedAt, inline: true }
        ],
        thumbnail: member.user.displayAvatarURL({ size: 128 }),
        user: member.user
      });
    }

    // ===== MESSAGE D'AU REVOIR =====
    db.get(
      "SELECT enabled, channel_id, message FROM goodbye_config WHERE guild_id = ?",
      [member.guild.id],
      (err, row) => {
        if (err || !row || !row.enabled) return;
  
        let msg = row.message || "Au revoir {user}, tu vas nous manquer !";
  
        msg = msg
          .replace("{user}", member.user.username)
          .replace("{server}", member.guild.name);
  
        const channel = member.guild.channels.cache.get(row.channel_id);
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle("👋 Au revoir...")
            .setDescription(msg)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

          channel.send({ embeds: [embed] });
        }
      }
    );
  },
};
