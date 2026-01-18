const { Events, EmbedBuilder, AuditLogEvent, AttachmentBuilder } = require("discord.js");
const db = require("../db");
const { sendLog } = require("../fonctions/sendLog");
const { generateWelcomeImage } = require("../fonctions/generateWelcomeImage");

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
    try {
      const row = await db.getAsync(
        `SELECT enabled, channel_id, message, message_type, 
                embed_title, embed_description, embed_color, embed_thumbnail, embed_footer,
                image_enabled, image_gradient, image_title, image_subtitle, image_show_member_count 
         FROM goodbye_config WHERE guild_id = ?`,
        [member.guild.id]
      );

      if (!row || !row.enabled) return;

      const channel = member.guild.channels.cache.get(row.channel_id);
      if (!channel) return;

      // Variables de remplacement
      const replaceVariables = (text) => {
        if (!text) return text;
        return text
          .replace(/{user}/g, member.user.username)
          .replace(/{server}/g, member.guild.name)
          .replace(/{membercount}/g, member.guild.memberCount.toString())
          .replace(/{userid}/g, member.id);
      };

      const messagePayload = { };

      // Message texte simple
      if (row.message_type === 'text' || row.message_type === 'both') {
        const textMsg = replaceVariables(row.message || "Au revoir {user}, tu vas nous manquer !");
        messagePayload.content = textMsg;
      }

      // Embed
      if (row.message_type === 'embed' || row.message_type === 'both') {
        const embed = new EmbedBuilder()
          .setColor(row.embed_color || '#ED4245')
          .setTimestamp();

        if (row.embed_title) {
          embed.setTitle(replaceVariables(row.embed_title));
        } else {
          embed.setTitle('👋 Au revoir...');
        }

        if (row.embed_description) {
          embed.setDescription(replaceVariables(row.embed_description));
        } else if (row.message) {
          embed.setDescription(replaceVariables(row.message));
        } else {
          embed.setDescription(`**${member.user.username}** a quitté le serveur.`);
        }

        if (row.embed_thumbnail) {
          embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }));
        }

        if (row.embed_footer) {
          embed.setFooter({ 
            text: replaceVariables(row.embed_footer), 
            iconURL: member.guild.iconURL({ dynamic: true }) 
          });
        } else {
          embed.setFooter({ 
            text: member.guild.name, 
            iconURL: member.guild.iconURL({ dynamic: true }) 
          });
        }

        messagePayload.embeds = [embed];
      }

      // Image générée
      if (row.image_enabled) {
        try {
          const imageBuffer = await generateWelcomeImage({
            type: 'goodbye',
            username: member.user.username,
            discriminator: member.user.discriminator,
            avatarURL: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
            serverName: member.guild.name,
            memberCount: row.image_show_member_count ? member.guild.memberCount : null,
            gradient: row.image_gradient || 'red',
            title: row.image_title ? replaceVariables(row.image_title) : null,
            subtitle: row.image_subtitle ? replaceVariables(row.image_subtitle) : null
          });

          const attachment = new AttachmentBuilder(imageBuffer, { name: 'goodbye.png' });
          messagePayload.files = [attachment];

          // Si on a un embed, mettre l'image dans l'embed
          if (messagePayload.embeds && messagePayload.embeds.length > 0) {
            messagePayload.embeds[0].setImage('attachment://goodbye.png');
          }
        } catch (imgErr) {
          console.error('Erreur génération image au revoir:', imgErr);
        }
      }

      // Envoyer le message si on a quelque chose à envoyer
      if (messagePayload.content || messagePayload.embeds || messagePayload.files) {
        await channel.send(messagePayload);
      }

    } catch (err) {
      console.error('Erreur message au revoir:', err);
    }
  },
};
