const db = require("../db.js");

module.exports = async function getPrefix(guildId) {
  const prefix = await new Promise((resolve, reject) => {
    db.get(
      `SELECT prefix FROM prefix WHERE guildId = ?`,
      [guildId],
      (err, row) => {
        if (err) reject(err);
        resolve(row);
      },
    );
  });

  return prefix ? prefix.prefix : "!";
};