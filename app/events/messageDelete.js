const { sendLog } = require('../fonctions/sendLog');

module.exports = {
  name: 'messageDelete',
  async execute(client, message) {
    // Ignorer les messages du bot et les messages système
    if (!message.guild) return;
    if (message.author?.bot) return;
    if (!message.content && message.attachments.size === 0 && message.embeds.length === 0) return;

    const fields = [
      { name: '👤 Auteur', value: message.author ? `${message.author} (${message.author.tag})` : 'Inconnu', inline: true },
      { name: '📁 Salon', value: `${message.channel} (#${message.channel.name})`, inline: true }
    ];

    // Ajouter le contenu du message s'il existe
    if (message.content) {
      const content = message.content.length > 1024 
        ? message.content.substring(0, 1021) + '...' 
        : message.content;
      fields.push({ name: '💬 Contenu', value: content, inline: false });
    }

    // Ajouter les pièces jointes
    if (message.attachments.size > 0) {
      const attachments = message.attachments.map(a => `[${a.name}](${a.url})`).join('\n');
      fields.push({ name: '📎 Pièces jointes', value: attachments.substring(0, 1024), inline: false });
    }

    await sendLog(client, message.guild.id, 'messages', {
      action: 'delete',
      title: '🗑️ Message supprimé',
      fields: fields,
      thumbnail: message.author?.displayAvatarURL({ size: 128 }),
      user: message.author
    });
  }
};
