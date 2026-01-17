const addCommand = require("../fonctions/addCommand");
const {
  SlashCommandBuilder,
  ButtonStyle,
  ButtonBuilder,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");

module.exports = addCommand(
  (this.name = "ping"),
  (this.description = "Cette commande permet de vérifier la latence du bot."),
  (this.aliases = ["latency", "lag", "responseTime"]),
  (this.permissions = []),
  (this.botOwnerOnly = false),
  (this.dm = true),
  (this.executePrefix = async (client, message, args) => {
    const pingBtn = new ButtonBuilder()
      .setCustomId("pingBtn")
      .setLabel("🔄")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(pingBtn);

    const embed = new EmbedBuilder()
      .setTitle("Pong !")
      .setDescription(`La latence du bot est de \`${client.ws.ping}\`ms.`)
      .setColor("#0099FF")
      .setTimestamp()
      .setFooter({
        text: `Demandé par ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL(),
      });

    const sendMessage = await message.reply({
      embeds: [embed],
      components: [row],
    });

    const filter = (i) => i.customId === "pingBtn";
    const collector = sendMessage.createMessageComponentCollector({
      filter,
      time: 120000,
    });
    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id)
        return i.reply({
          content: "Vous n'êtes pas l'auteur du message.",
          ephemeral: true,
        });
      const embed = new EmbedBuilder()
        .setTitle("Pong !")
        .setDescription(`La latence du bot est de \`${client.ws.ping}\`ms.`)
        .setColor("#0099FF")
        .setTimestamp()
        .setFooter({
          text: `Demandé par ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL(),
        });

      sendMessage.edit({ embeds: [embed], components: [row] });
      i.reply({ content: "La latence a été rafraichie.", ephemeral: true });
    });

    collector.on("end", async () => {
      const embed = new EmbedBuilder()
        .setTitle("Pong !")
        .setDescription(`La latence du bot est de \`${client.ws.ping}\`ms.`)
        .setColor("#0099FF")
        .setTimestamp()
        .setFooter({
          text: `Demandé par ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL(),
        });

      sendMessage.edit({ embeds: [embed], components: [] });
    });
  }),
  (this.executeSlash = async (client, interaction) => {
    const pingBtn = new ButtonBuilder()
      .setCustomId("pingBtn")
      .setLabel("🔄")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(pingBtn);

    const embed = new EmbedBuilder()
      .setTitle("Pong !")
      .setDescription(`La latence du bot est de \`${client.ws.ping}\`ms.`)
      .setColor("#0099FF")
      .setTimestamp()
      .setFooter({
        text: `Demandé par ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      });

    if (interaction.options.getBoolean("actualiser") === false) {
      const sendMessage = await interaction.reply({
        embeds: [embed],
        components: [row],
      });

      const filter = (i) => i.customId === "pingBtn";
      const collector = sendMessage.createMessageComponentCollector({
        filter,
        time: 120000,
      });
      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id)
          return i.reply({
            content: "Vous n'êtes pas l'auteur du message.",
            ephemeral: true,
          });
        const embed = new EmbedBuilder()
          .setTitle("Pong !")
          .setDescription(`La latence du bot est de \`${client.ws.ping}\`ms.`)
          .setColor("#0099FF")
          .setTimestamp()
          .setFooter({
            text: `Demandé par ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          });

        sendMessage.edit({ embeds: [embed], components: [row] });
        i.reply({ content: "La latence a été rafraichie.", ephemeral: true });
      });

      collector.on("end", async () => {
        const embed = new EmbedBuilder()
          .setTitle("Pong !")
          .setDescription(`La latence du bot est de \`${client.ws.ping}\`ms.`)
          .setColor("#0099FF")
          .setTimestamp()
          .setFooter({
            text: `Demandé par ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          });

        sendMessage.edit({ embeds: [embed], components: [] });
      });
    } else {
      const sendMessage = await interaction.reply({ embeds: [embed] });

      const interval = setInterval(() => {
        const embed = new EmbedBuilder()
          .setTitle("Pong !")
          .setDescription(`La latence du bot est de \`${client.ws.ping}\`ms.`)
          .setColor("#0099FF")
          .setTimestamp()
          .setFooter({
            text: `Demandé par ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          });

        sendMessage.edit({ embeds: [embed] });
      }, 10000);
      setTimeout(() => {
        clearInterval(interval);
      }, 120000);
    }
  }),
  (this.slashOptions = new SlashCommandBuilder().addBooleanOption((option) =>
    option
      .setName("actualiser")
      .setDescription(
        "Actualiser automatiquement la latence du bot toute les 10 secondes pandant 2 minutes.",
      )
      .setRequired(false),
  )),
);