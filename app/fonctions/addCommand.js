const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");

/**
 * Ajoute une nouvelle commande au bot.
 *
 * @param {Object} options
 * @param {string} options.name - Nom de la commande
 * @param {string} options.description - Description de la commande
 * @param {Array<string>} [options.aliases=[]] - Alias
 * @param {Array<number>} [options.permissions=[]] - Permissions requises
 * @param {boolean} [options.botOwnerOnly=false] - Réservé au propriétaire du bot
 * @param {boolean} [options.dm=false] - Disponible en DM
 * @param {"global"|"guild"} [options.scope="global"] - Portée de la commande
 * @param {(guildId: string) => Promise<boolean> | boolean} [options.guildCondition=null] - Condition pour les commandes de guild
 * @param {Function} options.executePrefix - Fonction à exécuter en préfixe
 * @param {Function} options.executeSlash - Fonction à exécuter en slash
 * @param {Array<Object>} [options.slashOptions=[]] - Options pour la commande slash
 *
 * @returns {Object} Commande prête à être ajoutée au bot
 */
function addCommand({
  name,
  description,
  aliases = [],
  permissions = [],
  botOwnerOnly = false,
  dm = false,
  scope = "global",
  guildCondition = null,
  executePrefix,
  executeSlash,
  slashOptions = []
}) {
  if (!name || !description) throw new Error("name et description requis");

  if (scope === "guild" && typeof guildCondition !== "function") {
    throw new Error("guildCondition requise pour scope=guild");
  }

  if (typeof executePrefix !== "function") throw new Error("executePrefix requis et doit être une fonction");
  if (typeof executeSlash !== "function") throw new Error("executeSlash requis et doit être une fonction");

  // Permissions
  let defaultMemberPermissions = null;
  if (permissions.length > 0) {
    // Résoudre en bitfield (BigInt) compatible avec setDefaultMemberPermissions
    defaultMemberPermissions = PermissionsBitField.resolve(permissions);
  }

  // Création du SlashCommandBuilder
  const slashData = new SlashCommandBuilder()
    .setName(name.toLowerCase())
    .setDescription(description)
    .setDMPermission(dm)
    .setDefaultMemberPermissions(defaultMemberPermissions);

  // Ajouter les options
  slashOptions.forEach(opt => {
    switch (opt.type) {
      case "STRING":
        slashData.addStringOption(o => {
          o.setName(opt.name).setDescription(opt.description || "No description").setRequired(!!opt.required);
          if (opt.choices && Array.isArray(opt.choices)) {
            o.addChoices(...opt.choices);
          }
          return o;
        });
        break;
      case "INTEGER":
        slashData.addIntegerOption(o => {
          o.setName(opt.name).setDescription(opt.description || "No description").setRequired(!!opt.required);
          if (opt.choices && Array.isArray(opt.choices)) {
            o.addChoices(...opt.choices);
          }
          return o;
        });
        break;
      case "BOOLEAN":
        slashData.addBooleanOption(o =>
          o.setName(opt.name).setDescription(opt.description || "No description").setRequired(!!opt.required)
        );
        break;
      case "USER":
        slashData.addUserOption(o =>
          o.setName(opt.name).setDescription(opt.description || "No description").setRequired(!!opt.required)
        );
        break;
      case "CHANNEL":
        slashData.addChannelOption(o =>
          o.setName(opt.name).setDescription(opt.description || "No description").setRequired(!!opt.required)
        );
        break;
      case "ROLE":
        slashData.addRoleOption(o =>
          o.setName(opt.name).setDescription(opt.description || "No description").setRequired(!!opt.required)
        );
        break;
      default:
        console.warn(`Option type inconnu pour ${opt.name}: ${opt.type}`);
    }
  });

  return {
    name,
    description,
    aliases,
    permissions,
    botOwnerOnly,
    dm,
    scope,
    guildCondition,
    executePrefix,
    executeSlash,
    data: slashData
  };
}

module.exports = addCommand;
