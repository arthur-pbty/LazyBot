const addCommand = require("../../fonctions/addCommand");
const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");

module.exports = addCommand({
  name: "help",
  description: "Affiche la liste des commandes disponibles.",
  aliases: ["h", "aide", "commands", "cmds"],
  permissions: [],
  botOwnerOnly: false,
  dm: true,
  executePrefix: async (client, message, args) => {
    const prefix = "!";

    // Si une commande spécifique est demandée
    if (args[0]) {
      const commandName = args[0].toLowerCase();
      const command = client.commands.get(commandName) ||
        client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

      if (!command) {
        const embed = new EmbedBuilder()
          .setTitle("❌ Commande introuvable")
          .setDescription(`La commande \`${args[0]}\` n'existe pas.\nUtilise \`${prefix}help\` pour voir toutes les commandes.`)
          .setColor("#ED4245")
          .setTimestamp()
          .setFooter({
            text: `Demandé par ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
          });

        return message.reply({ embeds: [embed] });
      }

      // Vérifier si la commande est désactivée sur ce serveur
      let isDisabled = false;
      if (command.scope === "guild" && message.guild?.id && typeof command.guildCondition === "function") {
        isDisabled = !(await command.guildCondition(message.guild.id));
      }

      const embed = new EmbedBuilder()
        .setTitle(`📖 Commande: ${command.name}`)
        .setDescription(command.description || "Pas de description.")
        .setColor(isDisabled ? "#FFA500" : "#5865F2")
        .addFields(
          { name: "📁 Catégorie", value: command.category || "Autres", inline: true },
          { name: "🏷️ Aliases", value: command.aliases?.length > 0 ? command.aliases.map(a => `\`${a}\``).join(", ") : "Aucun", inline: true },
          { name: "💬 Utilisation", value: `\`${prefix}${command.name}\` ou \`/${command.name}\``, inline: false }
        )
        .setTimestamp()
        .setFooter({
          text: `Demandé par ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        });

      if (command.permissions?.length > 0) {
        embed.addFields({ name: "🔒 Permissions requises", value: command.permissions.join(", "), inline: false });
      }

      if (isDisabled) {
        embed.addFields({ name: "⚠️ Statut", value: "Cette commande est **désactivée** sur ce serveur.", inline: false });
      }

      return message.reply({ embeds: [embed] });
    }

    // Créer les pages d'aide
    const pages = await createHelpPages(client, prefix, message.author, message.guild?.id);
    let currentPage = 0;

    const row = createNavigationRow(currentPage, pages.length);

    const reply = await message.reply({
      embeds: [pages[0]],
      components: [row]
    });

    const collector = reply.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 120000
    });

    collector.on("collect", async (i) => {
      if (i.customId === "help_first") currentPage = 0;
      else if (i.customId === "help_prev") currentPage = Math.max(0, currentPage - 1);
      else if (i.customId === "help_next") currentPage = Math.min(pages.length - 1, currentPage + 1);
      else if (i.customId === "help_last") currentPage = pages.length - 1;

      await i.update({
        embeds: [pages[currentPage]],
        components: [createNavigationRow(currentPage, pages.length)]
      });
    });

    collector.on("end", () => {
      reply.edit({ components: [] }).catch(() => {});
    });
  },

  executeSlash: async (client, interaction) => {
    const commandOption = interaction.options.getString("commande");
    const prefix = "!";

    // Si une commande spécifique est demandée
    if (commandOption) {
      const commandName = commandOption.toLowerCase();
      const command = client.commands.get(commandName) ||
        client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

      if (!command) {
        const embed = new EmbedBuilder()
          .setTitle("❌ Commande introuvable")
          .setDescription(`La commande \`${commandOption}\` n'existe pas.\nUtilise \`/help\` pour voir toutes les commandes.`)
          .setColor("#ED4245")
          .setTimestamp()
          .setFooter({
            text: `Demandé par ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
          });

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Vérifier si la commande est désactivée sur ce serveur
      let isDisabled = false;
      if (command.scope === "guild" && interaction.guild?.id && typeof command.guildCondition === "function") {
        isDisabled = !(await command.guildCondition(interaction.guild.id));
      }

      const embed = new EmbedBuilder()
        .setTitle(`📖 Commande: ${command.name}`)
        .setDescription(command.description || "Pas de description.")
        .setColor(isDisabled ? "#FFA500" : "#5865F2")
        .addFields(
          { name: "📁 Catégorie", value: command.category || "Autres", inline: true },
          { name: "🏷️ Aliases", value: command.aliases?.length > 0 ? command.aliases.map(a => `\`${a}\``).join(", ") : "Aucun", inline: true },
          { name: "💬 Utilisation", value: `\`${prefix}${command.name}\` ou \`/${command.name}\``, inline: false }
        )
        .setTimestamp()
        .setFooter({
          text: `Demandé par ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        });

      if (command.permissions?.length > 0) {
        embed.addFields({ name: "🔒 Permissions requises", value: command.permissions.join(", "), inline: false });
      }

      if (isDisabled) {
        embed.addFields({ name: "⚠️ Statut", value: "Cette commande est **désactivée** sur ce serveur.", inline: false });
      }

      return interaction.reply({ embeds: [embed] });
    }

    // Créer les pages d'aide
    const pages = await createHelpPages(client, prefix, interaction.user, interaction.guild?.id);
    let currentPage = 0;

    const row = createNavigationRow(currentPage, pages.length);

    const reply = await interaction.reply({
      embeds: [pages[0]],
      components: [row],
      fetchReply: true
    });

    const collector = reply.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 120000
    });

    collector.on("collect", async (i) => {
      if (i.customId === "help_first") currentPage = 0;
      else if (i.customId === "help_prev") currentPage = Math.max(0, currentPage - 1);
      else if (i.customId === "help_next") currentPage = Math.min(pages.length - 1, currentPage + 1);
      else if (i.customId === "help_last") currentPage = pages.length - 1;

      await i.update({
        embeds: [pages[currentPage]],
        components: [createNavigationRow(currentPage, pages.length)]
      });
    });

    collector.on("end", () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },

  slashOptions: [
    {
      type: "STRING",
      name: "commande",
      description: "Le nom de la commande pour obtenir plus d'informations",
      required: false
    }
  ]
});

async function createHelpPages(client, prefix, user, guildId) {
  const pages = [];

  // Récupérer toutes les catégories dynamiquement
  const categories = new Map();
  
  // Filtrer les commandes selon leur scope et guildCondition
  for (const [, cmd] of client.commands) {
    // Si la commande a scope "guild", vérifier la condition
    if (cmd.scope === "guild" && guildId && typeof cmd.guildCondition === "function") {
      const isEnabled = await cmd.guildCondition(guildId);
      if (!isEnabled) continue; // Ne pas ajouter cette commande
    }
    
    const category = cmd.category || "📦 Autres";
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category).push(cmd);
  }

  // Supprimer les catégories vides
  for (const [category, cmds] of categories) {
    if (cmds.length === 0) {
      categories.delete(category);
    }
  }

  // Compter le total de commandes visibles
  let totalCommands = 0;
  categories.forEach(cmds => totalCommands += cmds.length);

  // Page d'accueil
  const categoryList = Array.from(categories.keys()).map(c => `> ${c}`).join("\n");
  
  const welcomeEmbed = new EmbedBuilder()
    .setTitle("📚 Centre d'aide - LazyBot")
    .setDescription(
      `Bienvenue dans le centre d'aide de **LazyBot** !\n\n` +
      `🔹 Utilise les boutons pour naviguer entre les pages\n` +
      `🔹 Utilise \`${prefix}help <commande>\` ou \`/help commande:<nom>\` pour plus de détails\n\n` +
      `**📊 Statistiques**\n` +
      `> Commandes disponibles: **${totalCommands}**\n` +
      `> Catégories: **${categories.size}**`
    )
    .setColor("#5865F2")
    .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields({
      name: "📑 Catégories",
      value: categoryList || "Aucune catégorie",
      inline: false
    })
    .setTimestamp()
    .setFooter({
      text: `Page 1/${categories.size + 1} • Demandé par ${user.tag}`,
      iconURL: user.displayAvatarURL({ dynamic: true })
    });

  pages.push(welcomeEmbed);

  // Pages par catégorie
  let pageNum = 2;
  for (const [category, commands] of categories) {
    if (commands.length === 0) continue;
    
    const commandList = commands.map(cmd => {
      const aliases = cmd.aliases?.length > 0 ? ` *(${cmd.aliases.join(", ")})*` : "";
      return `> \`${prefix}${cmd.name}\`${aliases}\n> ┗ ${cmd.description || "Pas de description"}`;
    }).join("\n\n");

    const categoryEmbed = new EmbedBuilder()
      .setTitle(category)
      .setDescription(commandList || "Aucune commande dans cette catégorie.")
      .setColor("#5865F2")
      .setTimestamp()
      .setFooter({
        text: `Page ${pageNum}/${categories.size + 1} • Demandé par ${user.tag}`,
        iconURL: user.displayAvatarURL({ dynamic: true })
      });

    pages.push(categoryEmbed);
    pageNum++;
  }

  return pages;
}

function createNavigationRow(currentPage, totalPages) {
  const firstButton = new ButtonBuilder()
    .setCustomId("help_first")
    .setEmoji("⏮️")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentPage === 0);

  const prevButton = new ButtonBuilder()
    .setCustomId("help_prev")
    .setEmoji("◀️")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(currentPage === 0);

  const pageIndicator = new ButtonBuilder()
    .setCustomId("help_page")
    .setLabel(`${currentPage + 1}/${totalPages}`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const nextButton = new ButtonBuilder()
    .setCustomId("help_next")
    .setEmoji("▶️")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(currentPage === totalPages - 1);

  const lastButton = new ButtonBuilder()
    .setCustomId("help_last")
    .setEmoji("⏭️")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentPage === totalPages - 1);

  return new ActionRowBuilder().addComponents(firstButton, prevButton, pageIndicator, nextButton, lastButton);
}
