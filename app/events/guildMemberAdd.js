const { Events, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const db = require("../db");
const { sendLog } = require("../fonctions/sendLog");
const antiraid = require("../fonctions/antiraid");
const { generateWelcomeImage } = require("../fonctions/generateWelcomeImage");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(client, member) {
    // ===== ANTI-RAID CHECKS =====
    await antiraid.checkMemberJoin(member, client);

    // ===== LOG MEMBRE REJOINT =====
    const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
    const accountAgeStr = accountAge < 1 ? 'Moins d\'un jour' : 
                          accountAge < 7 ? `${accountAge} jours ⚠️` :
                          accountAge < 30 ? `${accountAge} jours` :
                          accountAge < 365 ? `${Math.floor(accountAge / 30)} mois` :
                          `${Math.floor(accountAge / 365)} ans`;

    await sendLog(client, member.guild.id, 'members', {
      action: 'join',
      title: '📥 Membre rejoint',
      description: `**${member.user.tag}** a rejoint le serveur.`,
      fields: [
        { name: '👤 Membre', value: `${member} (${member.user.tag})`, inline: true },
        { name: '📊 Membres', value: `${member.guild.memberCount}`, inline: true },
        { name: '📅 Compte créé', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '⏳ Âge du compte', value: accountAgeStr, inline: true }
      ],
      thumbnail: member.user.displayAvatarURL({ size: 128 }),
      user: member.user
    });

    // ===== MESSAGE DE BIENVENUE =====
    try {
      const row = await db.getAsync(
        `SELECT enabled, channel_id, message, message_type, 
                embed_title, embed_description, embed_color, embed_thumbnail, embed_footer,
                image_enabled, image_gradient, image_title, image_subtitle, image_show_member_count 
         FROM welcome_config WHERE guild_id = ?`,
        [member.guild.id]
      );

      if (!row || !row.enabled) return processAutorole();

      const channel = member.guild.channels.cache.get(row.channel_id);
      if (!channel) return processAutorole();

      // Variables de remplacement
      const replaceVariables = (text) => {
        if (!text) return text;
        return text
          .replace(/{user}/g, member.user.username)
          .replace(/{mention}/g, `<@${member.id}>`)
          .replace(/{server}/g, member.guild.name)
          .replace(/{membercount}/g, member.guild.memberCount.toString())
          .replace(/{userid}/g, member.id);
      };

      const messagePayload = { };

      // Message texte simple
      if (row.message_type === 'text' || row.message_type === 'both') {
        const textMsg = replaceVariables(row.message || "Bienvenue {mention} sur {server} !");
        messagePayload.content = textMsg;
      }

      // Embed
      if (row.message_type === 'embed' || row.message_type === 'both') {
        const embed = new EmbedBuilder()
          .setColor(row.embed_color || '#57F287')
          .setTimestamp();

        if (row.embed_title) {
          embed.setTitle(replaceVariables(row.embed_title));
        } else {
          embed.setTitle('👋 Bienvenue !');
        }

        if (row.embed_description) {
          embed.setDescription(replaceVariables(row.embed_description));
        } else if (row.message) {
          embed.setDescription(replaceVariables(row.message));
        } else {
          embed.setDescription(`Bienvenue ${member} sur **${member.guild.name}** !`);
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
            type: 'welcome',
            username: member.user.username,
            discriminator: member.user.discriminator,
            avatarURL: member.user.displayAvatarURL({ extension: 'png', size: 256 }),
            serverName: member.guild.name,
            memberCount: row.image_show_member_count ? member.guild.memberCount : null,
            gradient: row.image_gradient || 'purple',
            title: row.image_title ? replaceVariables(row.image_title) : null,
            subtitle: row.image_subtitle ? replaceVariables(row.image_subtitle) : null
          });

          const attachment = new AttachmentBuilder(imageBuffer, { name: 'welcome.png' });
          messagePayload.files = [attachment];

          // Si on a un embed, mettre l'image dans l'embed
          if (messagePayload.embeds && messagePayload.embeds.length > 0) {
            messagePayload.embeds[0].setImage('attachment://welcome.png');
          }
        } catch (imgErr) {
          console.error('Erreur génération image bienvenue:', imgErr);
        }
      }

      // Envoyer le message si on a quelque chose à envoyer
      if (messagePayload.content || messagePayload.embeds || messagePayload.files) {
        await channel.send(messagePayload);
      }

    } catch (err) {
      console.error('Erreur message bienvenue:', err);
    }

    // ===== AUTOROLE =====
    async function processAutorole() {
      try {
        const row = await db.getAsync(
          "SELECT enabled, role_id FROM autorole_newuser_config WHERE guild_id = ?",
          [member.guild.id]
        );

        if (!row || !row.enabled) return;

        const role = member.guild.roles.cache.get(row.role_id);
        if (role) {
          await member.roles.add(role);
        }
      } catch (err) {
        console.error('Erreur autorole:', err);
      }
    }

    processAutorole();
  },
};
