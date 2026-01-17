const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");

/**
 * Ajoute une nouvelle commande au bot.
 *
 * @param {string} name - Le nom de la commande.
 * @param {string} description - La description de la commande.
 * @param {Array<string>} aliases - Les alias de la commande.
 * @param {Array<PermissionsBitField>} permissions - Les permissions nécessaires pour exécuter la commande.
 * @param {boolean} botOwnerOnly - Si la commande est réservée au propriétaire du bot.
 * @param {boolean} dm - Si la commande peut être exécutée en message privé.
 * @param {Function} executePrefix - La fonction à exécuter avec un préfixe.
 * @param {Function} executeSlash - La fonction à exécuter comme commande slash.
 * @param {Array<Object>} slashOptions - Les options pour la commande slash.
 *
 * @returns {void} Ne retourne rien.
 */
function addCommand(
  name,
  description,
  aliases,
  permissions,
  botOwnerOnly,
  dm,
  executePrefix,
  executeSlash,
  slashOptions,
) {
  if (!name) return console.error("Le nom de la commande est requis.");
  name = name.toString();
  name = name.toLowerCase();
  name = name.replace(/ /g, "_");
  if (!description)
    return console.error("La description de la commande est requise.");
  description = description.toString();
  if (!aliases) aliases = [];
  if (!Array.isArray(aliases)) aliases = [aliases];
  aliases = aliases.map((alias) => alias.toString());
  if (!permissions) permissions = [];
  if (!Array.isArray(permissions)) permissions = [permissions];
  if (!botOwnerOnly) botOwnerOnly = false;
  botOwnerOnly = Boolean(botOwnerOnly);
  if (!dm) dm = false;
  dm = Boolean(dm);
  if (!executePrefix)
    return console.error("La fonction executePrefix est requise.");
  if (!executeSlash)
    return console.error("La fonction executeSlash est requise.");
  if (
    typeof executePrefix !== "function" ||
    executePrefix.constructor.name !== "AsyncFunction"
  ) {
    return console.error(
      "La fonction executePrefix doit être une fonction asynchrone.",
    );
  }
  if (
    typeof executeSlash !== "function" ||
    executeSlash.constructor.name !== "AsyncFunction"
  ) {
    return console.error(
      "La fonction executeSlash doit être une fonction asynchrone.",
    );
  }
  const executePrefixParams = executePrefix
    .toString()
    .match(/\(([^)]+)\)/)[1]
    .split(",")
    .map((param) => param.trim());
  if (
    executePrefixParams.length !== 3 ||
    executePrefixParams[0] !== "client" ||
    executePrefixParams[1] !== "message" ||
    executePrefixParams[2] !== "args"
  ) {
    return console.error(
      'La fonction executePrefix doit avoir les paramètres "client", "message" et "args".',
    );
  }
  const executeSlashParams = executeSlash
    .toString()
    .match(/\(([^)]+)\)/)[1]
    .split(",")
    .map((param) => param.trim());
  if (
    executeSlashParams.length !== 2 ||
    executeSlashParams[0] !== "client" ||
    executeSlashParams[1] !== "interaction"
  ) {
    return console.error(
      'La fonction executeSlash doit avoir les paramètres "client" et "interaction".',
    );
  }

  const command = {
    name,
    description,
    aliases,
    permissions,
    botOwnerOnly,
    dm,
    executePrefix,
    executeSlash,
  };

  let default_member_permissions;
  if (command.permissions.length === 0) {
    default_member_permissions = null;
  } else {
    default_member_permissions = new PermissionsBitField();
    command.permissions.forEach(
      (permission) => (default_member_permissions += BigInt(permission)),
    );
  }
  command.data = new SlashCommandBuilder()
    .setName(command.name)
    .setDescription(command.description)
    .setDMPermission(command.dm)
    .setDefaultMemberPermissions(default_member_permissions);

  for (const key in command.data) {
    if (command.data.hasOwnProperty(key)) {
      const value = command.data[key];

      if (value !== undefined && key !== "options") {
        slashOptions[key] = value;
      }
    }
  }

  command.data = slashOptions;

  let utilisation = "";

  command.data.options.forEach((option) => {
    let optionUsage = "";
    if (option.choices) {
      optionUsage = option.required
        ? `<${option.choices.map((choice) => choice.name).join("|")}>`
        : `[${option.choices.map((choice) => choice.name).join("|")}]`;
    } else {
      if (option.type === 3) {
        optionUsage = option.required ? `<${option.name}>` : `[${option.name}]`;
      } else if (option.type === 4) {
        optionUsage = option.required ? `<${option.name}>` : `[${option.name}]`;
      } else if (option.type === 5) {
        optionUsage = option.required ? `<True|False>` : `[True|False]`;
      } else if (option.type === 6) {
        optionUsage = option.required ? `<@member>` : `[@member]`;
      } else if (option.type === 7) {
        optionUsage = option.required ? `<#channel>` : `[#channel]`;
      } else if (option.type === 8) {
        optionUsage = option.required ? `<@role>` : `[@role]`;
      } else if (option.type === 9) {
        optionUsage = option.required ? `<@mention>` : `[@mention]`;
      } else if (option.type === 10) {
        optionUsage = option.required ? `<${option.name}>` : `[${option.name}]`;
      } else if (option.type === 11) {
        optionUsage = option.required ? `<${option.name}>` : `[${option.name}]`;
      }
    }

    utilisation += ` ${optionUsage}`;
  });

  utilisation = utilisation.trim();
  command.utilisation = utilisation;

  return command;
}

module.exports = addCommand;