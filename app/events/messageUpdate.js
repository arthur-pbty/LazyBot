const { sendLog } = require('../fonctions/sendLog');

module.exports = {
  name: 'messageUpdate',
  async execute(client, oldMessage, newMessage) {
    // Ignorer si pas de guild ou si c'est un bot
    if (!newMessage.guild) return;
    if (newMessage.author?.bot) return;
    
    // Ignorer si le contenu n'a pas changé (peut être un embed qui se charge)
    if (oldMessage.content === newMessage.content) return;
    
    // Ignorer les messages vides
    if (!oldMessage.content && !newMessage.content) return;

    const oldContent = oldMessage.content 
      ? (oldMessage.content.length > 1024 ? oldMessage.content.substring(0, 1021) + '...' : oldMessage.content)
      : '*Message vide ou non caché*';
    
    const newContent = newMessage.content 
      ? (newMessage.content.length > 1024 ? newMessage.content.substring(0, 1021) + '...' : newMessage.content)
      : '*Message vide*';

    await sendLog(client, newMessage.guild.id, 'messages', {
      action: 'edit',
      title: '✏️ Message modifié',
      description: `[Aller au message](${newMessage.url})`,
      fields: [
        { name: '👤 Auteur', value: `${newMessage.author} (${newMessage.author.tag})`, inline: true },
        { name: '📁 Salon', value: `${newMessage.channel} (#${newMessage.channel.name})`, inline: true },
        { name: '📝 Avant', value: oldContent, inline: false },
        { name: '📝 Après', value: newContent, inline: false }
      ],
      thumbnail: newMessage.author?.displayAvatarURL({ size: 128 }),
      user: newMessage.author
    });
  }
};
