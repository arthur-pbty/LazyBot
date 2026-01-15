const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
  path.join(__dirname, process.env.DB_PATH || "database.sqlite"),
  err => {
    if (err) console.error("Erreur DB:", err);
    else console.log("DB SQLite connectée");
  }
);

// Création de la table si elle n'existe pas
db.run(`
  CREATE TABLE IF NOT EXISTS welcome_config (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT,
    enabled INTEGER NOT NULL,
    message TEXT NOT NULL
  )
`);

module.exports = db;
