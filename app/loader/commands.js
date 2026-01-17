const fs = require("fs");
const path = require("path");
const { Collection } = require("discord.js");

module.exports = (client) => {
  client.commands = new Collection();

  function loadCommandsFromDirectory(directory) {
    fs.readdir(directory, (err, files) => {
      if (err) {
        console.error("Erreur lors de la lecture du dossier:", err);
        return;
      }

      files.forEach((file) => {
        const filePath = path.join(directory, file);

        fs.stat(filePath, (err, stats) => {
          if (err) {
            console.error(
              "Erreur lors de la récupération des informations du fichier:",
              err,
            );
            return;
          }

          if (stats.isDirectory()) {
            loadCommandsFromDirectory(filePath);
          } else if (stats.isFile() && file.endsWith(".js")) {
            try {
              const command = require(filePath);
              const commandName = command.name || file.split(".")[0];
              if (!command.category) {
                const parentDir = path.basename(path.dirname(filePath));
                command.category =
                  parentDir === "commands" ? "🌟・Other" : parentDir;
              }
              if (!command.dm) command.dm = false;
              if (!command.botOwnerOnly) command.botOwnerOnly = false;
              if (!command.permissions) command.permissions = [];
              if (!command.aliases) command.aliases = [];
              if (!command.description)
                command.description = "Aucune description.";
              client.commands.set(commandName, command);
              delete require.cache[require.resolve(filePath)];
            } catch (error) {
              console.error(
                `Erreur lors du chargement de la commande '${file}':`,
                error,
              );
            }
          }
        });
      });
    });
  }

  loadCommandsFromDirectory(path.join(__dirname, "..", "commands"));
};