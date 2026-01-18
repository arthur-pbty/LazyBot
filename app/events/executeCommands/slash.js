module.exports = {
  name: "interactionCreate",
  async execute(client, interaction) {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Vérification du scope / guildCondition
    if (command.scope === "guild") {
      const guildId = interaction.guild ? interaction.guild.id : null;
      if (!guildId)
        return interaction.reply({ content: "Cette commande ne peut pas être utilisée en message privé.", ephemeral: true });
      if (typeof command.guildCondition === "function") {
        let allowed = false;
        try {
          allowed = await command.guildCondition(guildId);
        } catch (err) {
          console.error(`Erreur guildCondition pour la guild ${guildId}`, err);
          allowed = false;
        }
        if (!allowed)
          return interaction.reply({ content: "Cette commande est désactivée sur ce serveur.", ephemeral: true });
      }
    }

    if (command.dm !== true && interaction.channel.type === 1)
      return interaction.reply({
        content: "Cette commande ne peut pas être utilisée en message privé.",
        ephemeral: true,
      });

    // Vérification si la commande est réservée au propriétaire du bot
    const isOwner = process.env.OWNER && process.env.OWNER === interaction.user.id;
    
    if (command.botOwnerOnly && !isOwner) {
      return interaction.reply({
        content: "Cette commande est réservée au propriétaire du bot.",
        ephemeral: true,
      });
    }

    // Vérification des permissions (sauf pour le propriétaire du bot)
    if (
      !isOwner &&
      command.permissions &&
      command.permissions.length > 0 &&
      interaction.channel.type !== 1 &&
      !command.permissions.every((permission) =>
        interaction.member.permissions.has(permission)
      )
    ) {
      return interaction.reply({
        content: "Vous n'avez pas la permission d'utiliser cette commande.",
        ephemeral: true,
      });
    }

    try {
      command.executeSlash(client, interaction);
      console.log(
        `[CMD - SLASH] ${interaction.user.tag} | ${interaction.commandName}`,
      );
    } catch (error) {
      console.error(
        `Erreur lors de l'exécution de la commande slash '${interaction.commandName}':`,
        error,
      );
    }
  },
};