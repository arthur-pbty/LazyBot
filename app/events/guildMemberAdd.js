const { Events, EmbedBuilder } = require("discord.js");
const db = require("../db");
const { sendLog } = require("../fonctions/sendLog");
const antiraid = require("../fonctions/antiraid");

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
    db.get(
      "SELECT enabled, channel_id, message FROM welcome_config WHERE guild_id = ?",
      [member.guild.id],
      (err, row) => {
        if (err || !row || !row.enabled) return;

        let msg = row.message || "Bienvenue {mention} sur {server} !";

        msg = msg
          .replace("{user}", member.user.username)
          .replace("{mention}", `<@${member.id}>`)
          .replace("{server}", member.guild.name);

        const channel = member.guild.channels.cache.get(row.channel_id);
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle("👋 Bienvenue !")
            .setDescription(msg)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

          channel.send({ embeds: [embed] });
        }
      }
    );

    // ===== AUTOROLE =====
    db.get(
      "SELECT enabled, role_id FROM autorole_newuser_config WHERE guild_id = ?",
      [member.guild.id],
      (err, row) => {
        if (err || !row || !row.enabled) return;

        const role = member.guild.roles.cache.get(row.role_id);
        if (role) {
          member.roles.add(role);
        }
      }
    );
  },
};
