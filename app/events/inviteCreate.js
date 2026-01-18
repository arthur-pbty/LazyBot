const { sendLog } = require('../fonctions/sendLog');

module.exports = {
  name: 'inviteCreate',
  async execute(client, invite) {
    if (!invite.guild) return;

    const fields = [
      { name: '🔗 Code', value: invite.code, inline: true },
      { name: '📁 Salon', value: invite.channel ? `${invite.channel} (#${invite.channel.name})` : 'Inconnu', inline: true }
    ];

    if (invite.maxUses) {
      fields.push({ name: '🔢 Utilisations max', value: invite.maxUses.toString(), inline: true });
    }

    if (invite.maxAge) {
      const hours = Math.floor(invite.maxAge / 3600);
      const minutes = Math.floor((invite.maxAge % 3600) / 60);
      let expiration = '';
      if (hours > 0) expiration += `${hours}h `;
      if (minutes > 0) expiration += `${minutes}m`;
      if (!expiration) expiration = 'Jamais';
      fields.push({ name: '⏰ Expire dans', value: expiration, inline: true });
    } else {
      fields.push({ name: '⏰ Expiration', value: 'Jamais', inline: true });
    }

    if (invite.temporary) {
      fields.push({ name: '⏳ Temporaire', value: 'Oui (membres expulsés s\'ils quittent)', inline: true });
    }

    await sendLog(client, invite.guild.id, 'invites', {
      action: 'create',
      title: '🔗 Invitation créée',
      description: `Une nouvelle invitation a été créée: **discord.gg/${invite.code}**`,
      fields: fields,
      executor: invite.inviter
    });
  }
};
