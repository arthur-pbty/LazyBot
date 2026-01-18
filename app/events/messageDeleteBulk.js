const { sendLog } = require('../fonctions/sendLog');

module.exports = {
  name: 'messageDeleteBulk',
  async execute(client, messages, channel) {
    if (!channel.guild) return;

    const messageList = messages.map(m => {
      const author = m.author ? m.author.tag : 'Inconnu';
      const content = m.content 
        ? (m.content.length > 50 ? m.content.substring(0, 47) + '...' : m.content)
        : '*Pas de contenu*';
      return `**${author}**: ${content}`;
    }).slice(0, 10).join('\n');

    const additionalCount = messages.size > 10 ? `\n... et ${messages.size - 10} autres messages` : '';

    await sendLog(client, channel.guild.id, 'messages', {
      action: 'delete',
      title: '🗑️ Suppression en masse',
      description: `**${messages.size}** messages ont été supprimés dans ${channel}.`,
      fields: [
        { name: '📁 Salon', value: `${channel} (#${channel.name})`, inline: true },
        { name: '📊 Nombre', value: `${messages.size} messages`, inline: true },
        { name: '📝 Aperçu', value: (messageList + additionalCount).substring(0, 1024) || '*Aucun aperçu*', inline: false }
      ]
    });
  }
};
