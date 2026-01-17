const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  function loadEventsFromDirectory(directory) {
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
            loadEventsFromDirectory(filePath);
          } else if (stats.isFile() && file.endsWith(".js")) {
            try {
              const event = require(filePath);
              let eventName = event.name || file.split(".")[0];
              client.on(eventName, event.execute.bind(null, client));
              delete require.cache[require.resolve(filePath)];
            } catch (error) {
              console.error(
                `Erreur lors du chargement de l'événement '${file}':`,
                error,
              );
            }
          }
        });
      });
    });
  }

  loadEventsFromDirectory(path.join(__dirname, "..", "events"));
};