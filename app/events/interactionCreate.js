const { Events, EmbedBuilder } = require("discord.js");
const db = require("../db");

module.exports = {
  name: Events.InteractionCreate,
  async execute(client, interaction) {
    // Gérer uniquement les boutons de rôles
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('role_panel_')) return;

    const buttonId = interaction.customId.replace('role_panel_', '');
    
    try {
      // Récupérer les infos du bouton
      const button = await db.getAsync(
        "SELECT rpb.*, rp.mode, rp.exclusive, rp.required_role_id, rp.enabled as panel_enabled FROM role_panel_buttons rpb JOIN role_panels rp ON rpb.panel_id = rp.id WHERE rpb.id = ?",
        [buttonId]
      );

      if (!button) {
        return interaction.reply({
          content: '❌ Ce bouton n\'est plus valide.',
          ephemeral: true
        });
      }

      if (!button.panel_enabled || !button.enabled) {
        return interaction.reply({
          content: '❌ Ce système de rôles est actuellement désactivé.',
          ephemeral: true
        });
      }

      // Vérifier le rôle requis
      if (button.required_role_id) {
        if (!interaction.member.roles.cache.has(button.required_role_id)) {
          return interaction.reply({
            content: `❌ Vous devez avoir le rôle <@&${button.required_role_id}> pour utiliser ce menu.`,
            ephemeral: true
          });
        }
      }

      const role = interaction.guild.roles.cache.get(button.role_id);
      if (!role) {
        return interaction.reply({
          content: '❌ Le rôle associé à ce bouton n\'existe plus.',
          ephemeral: true
        });
      }

      // Vérifier que le bot peut gérer ce rôle
      if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({
          content: '❌ Je ne peux pas gérer ce rôle car il est au-dessus de mon rôle le plus élevé.',
          ephemeral: true
        });
      }

      const hasRole = interaction.member.roles.cache.has(role.id);

      // Mode exclusif : retirer les autres rôles du même panel
      if (button.exclusive && !hasRole) {
        const panelButtons = await db.allAsync(
          "SELECT role_id FROM role_panel_buttons WHERE panel_id = ? AND id != ?",
          [button.panel_id, buttonId]
        );

        for (const btn of panelButtons) {
          if (interaction.member.roles.cache.has(btn.role_id)) {
            await interaction.member.roles.remove(btn.role_id).catch(() => {});
          }
        }
      }

      // Gérer le rôle selon le mode
      if (hasRole) {
        // Mode toggle : retirer le rôle
        if (button.mode === 'toggle') {
          await interaction.member.roles.remove(role);
          return interaction.reply({
            content: `✅ Le rôle ${role} vous a été retiré.`,
            ephemeral: true
          });
        } else {
          // Mode add-only : ne pas retirer
          return interaction.reply({
            content: `ℹ️ Vous avez déjà le rôle ${role}.`,
            ephemeral: true
          });
        }
      } else {
        // Ajouter le rôle
        await interaction.member.roles.add(role);
        return interaction.reply({
          content: `✅ Le rôle ${role} vous a été attribué !`,
          ephemeral: true
        });
      }

    } catch (err) {
      console.error('Erreur interaction role panel:', err);
      return interaction.reply({
        content: '❌ Une erreur est survenue.',
        ephemeral: true
      });
    }
  }
};
