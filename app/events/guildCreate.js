const { Events, EmbedBuilder, ChannelType } = require("discord.js");

module.exports = {
  name: Events.GuildCreate,
  async execute(client, guild) {
    console.log(`✅ Bot ajouté au serveur: ${guild.name} (${guild.id})`);

    const panelUrl = process.env.URL;
    const guildConfigUrl = `${panelUrl}/guild/${guild.id}`;

    // ===== MESSAGE DANS LE SALON PRINCIPAL =====
    try {
      // Trouver le meilleur salon pour envoyer le message
      let targetChannel = null;

      // 1. Essayer le salon système (où apparaissent les messages de bienvenue Discord)
      if (guild.systemChannel && guild.systemChannel.permissionsFor(client.user)?.has(['SendMessages', 'EmbedLinks'])) {
        targetChannel = guild.systemChannel;
      }

      // 2. Sinon, essayer le salon "général" ou similaire
      if (!targetChannel) {
        const generalNames = ['général', 'general', 'chat', 'discussion', 'bienvenue', 'welcome', 'lobby'];
        targetChannel = guild.channels.cache.find(ch => 
          ch.type === ChannelType.GuildText && 
          generalNames.some(name => ch.name.toLowerCase().includes(name)) &&
          ch.permissionsFor(client.user)?.has(['SendMessages', 'EmbedLinks'])
        );
      }

      // 3. Sinon, prendre le premier salon textuel où on peut écrire
      if (!targetChannel) {
        targetChannel = guild.channels.cache.find(ch => 
          ch.type === ChannelType.GuildText && 
          ch.permissionsFor(client.user)?.has(['SendMessages', 'EmbedLinks'])
        );
      }

      if (targetChannel) {
        const welcomeEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle("👋 Bonjour ! Je suis LazyBot")
          .setDescription(
            `Merci de m'avoir ajouté sur **${guild.name}** ! 🎉\n\n` +
            `Je suis un bot multifonction qui peut vous aider avec :\n` +
            `> 📈 Système de **niveaux** et d'**XP**\n` +
            `> 💰 Système d'**économie**\n` +
            `> 👋 Messages de **bienvenue/au revoir** personnalisés\n` +
            `> 🛡️ Protection **anti-raid**\n` +
            `> 📜 **Logs** complets du serveur\n` +
            `> 🎭 **Rôles automatiques** et par boutons\n` +
            `> 🔊 Salons vocaux **temporaires**\n` +
            `> ⏰ Messages **programmés**\n` +
            `> Et bien plus encore !`
          )
          .addFields(
            {
              name: "🔧 Configuration",
              value: `Configurez-moi facilement via le **panel web** :\n🔗 ${guildConfigUrl}`,
              inline: false
            },
            {
              name: "📖 Commandes",
              value: "Utilisez `/help` pour voir toutes mes commandes !",
              inline: true
            },
            {
              name: "❓ Support",
              value: "Besoin d'aide ? Contactez le propriétaire du bot.",
              inline: true
            }
          )
          .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .setFooter({ text: "LazyBot • Votre assistant Discord", iconURL: client.user.displayAvatarURL() })
          .setTimestamp();

        await targetChannel.send({ embeds: [welcomeEmbed] });
        console.log(`📨 Message de bienvenue envoyé dans #${targetChannel.name} sur ${guild.name}`);
      }
    } catch (err) {
      console.error(`❌ Erreur envoi message serveur (${guild.name}):`, err.message);
    }

    // ===== DM AU PROPRIÉTAIRE =====
    try {
      const owner = await guild.fetchOwner();
      
      if (owner) {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("🎉 LazyBot a rejoint votre serveur !")
          .setDescription(
            `Bonjour **${owner.user.username}** !\n\n` +
            `Je viens d'être ajouté sur votre serveur **${guild.name}**.\n` +
            `Je suis prêt à vous aider avec de nombreuses fonctionnalités !`
          )
          .addFields(
            {
              name: "🔧 Configurez-moi",
              value: 
                `Accédez au **panel de configuration** pour personnaliser toutes mes fonctionnalités :\n\n` +
                `🔗 **[Cliquez ici pour configurer](${guildConfigUrl})**\n\n` +
                `Ou copiez ce lien : \`${guildConfigUrl}\``,
              inline: false
            },
            {
              name: "⚡ Démarrage rapide",
              value: 
                "**1.** Connectez-vous au panel avec Discord\n" +
                "**2.** Sélectionnez votre serveur\n" +
                "**3.** Configurez les modules que vous souhaitez\n" +
                "**4.** C'est tout ! Les changements sont instantanés",
              inline: false
            },
            {
              name: "📋 Fonctionnalités disponibles",
              value: 
                "• 👋 Messages de bienvenue/au revoir avec images\n" +
                "• 📈 Système de niveaux et XP\n" +
                "• 💰 Économie virtuelle\n" +
                "• 🛡️ Anti-raid et modération\n" +
                "• 📜 Logs détaillés\n" +
                "• 🎭 Rôles automatiques et par boutons\n" +
                "• 🔊 Salons vocaux temporaires\n" +
                "• Et plus encore...",
              inline: false
            }
          )
          .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) || client.user.displayAvatarURL())
          .setFooter({ text: "LazyBot • Ce message est envoyé automatiquement lors de l'ajout du bot", iconURL: client.user.displayAvatarURL() })
          .setTimestamp();

        await owner.send({ embeds: [dmEmbed] });
        console.log(`📨 DM envoyé au propriétaire ${owner.user.tag} pour ${guild.name}`);
      }
    } catch (err) {
      // Le propriétaire a peut-être désactivé les DMs
      console.log(`⚠️ Impossible d'envoyer un DM au propriétaire de ${guild.name}: ${err.message}`);
    }
  },
};
