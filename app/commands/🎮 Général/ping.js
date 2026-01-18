const addCommand = require("../../fonctions/addCommand");
const {
  SlashCommandBuilder,
  ButtonStyle,
  ButtonBuilder,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");

module.exports = addCommand({
  name: "ping",
  description: "Cette commande permet de vérifier la latence du bot.",
  aliases: ["latency", "lag", "responseTime"],
  permissions: [],
  botOwnerOnly: false,
  dm: true,
  scope: "global",

  slashOptions: [
    {
      type: "BOOLEAN",
      name: "actualiser",
      description:
        "Actualiser automatiquement la latence du bot toutes les 10 secondes pendant 2 minutes.",
      required: false,
    },
  ],

  executePrefix: async (client, message, args) => {
    const pingBtn = new ButtonBuilder()
      .setCustomId("pingBtn")
      .setLabel("🔄")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(pingBtn);

    const embed = (user) =>
      new EmbedBuilder()
        .setTitle("Pong !")
        .setDescription(`La latence du bot est de \`${client.ws.ping}\`ms.`)
        .setColor("#0099FF")
        .setTimestamp()
        .setFooter({ text: `Demandé par ${user.tag}`, iconURL: user.displayAvatarURL() });

    const sendMessage = await message.reply({ embeds: [embed(message.author)], components: [row] });

    const filter = (i) => i.customId === "pingBtn";
    const collector = sendMessage.createMessageComponentCollector({ filter, time: 120_000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id)
        return i.reply({ content: "Vous n'êtes pas l'auteur du message.", ephemeral: true });

      await sendMessage.edit({ embeds: [embed(i.user)], components: [row] });
      await i.reply({ content: "La latence a été rafraichie.", ephemeral: true });
    });

    collector.on("end", async () => {
      await sendMessage.edit({ embeds: [embed(message.author)], components: [] });
    });
  },

  executeSlash: async (client, interaction) => {
    const actualiser = interaction.options.getBoolean("actualiser") ?? false;

    const pingBtn = new ButtonBuilder()
      .setCustomId("pingBtn")
      .setLabel("🔄")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(pingBtn);

    const embed = (user) =>
      new EmbedBuilder()
        .setTitle("Pong !")
        .setDescription(`La latence du bot est de \`${client.ws.ping}\`ms.`)
        .setColor("#0099FF")
        .setTimestamp()
        .setFooter({ text: `Demandé par ${user.tag}`, iconURL: user.displayAvatarURL() });

    const sendMessage = await interaction.reply({
      embeds: [embed(interaction.user)],
      components: actualiser ? [] : [row],
      fetchReply: true,
    });

    if (!actualiser) {
      const filter = (i) => i.customId === "pingBtn";
      const collector = sendMessage.createMessageComponentCollector({ filter, time: 120_000 });

      collector.on("collect", async (i) => {
        if (i.user.id !== interaction.user.id)
          return i.reply({ content: "Vous n'êtes pas l'auteur du message.", ephemeral: true });

        await sendMessage.edit({ embeds: [embed(i.user)], components: [row] });
        await i.reply({ content: "La latence a été rafraichie.", ephemeral: true });
      });

      collector.on("end", async () => {
        await sendMessage.edit({ embeds: [embed(interaction.user)], components: [] });
      });
    } else {
      const interval = setInterval(async () => {
        await sendMessage.edit({ embeds: [embed(interaction.user)] });
      }, 10_000);

      setTimeout(() => clearInterval(interval), 120_000);
    }
  },
});
