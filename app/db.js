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
db.exec(`
  CREATE TABLE IF NOT EXISTS welcome_config (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT,
    enabled INTEGER NOT NULL,
    message TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS goodbye_config (
    guild_id TEXT PRIMARY KEY,
    channel_id TEXT,
    enabled INTEGER NOT NULL,
    message TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS autorole_newuser_config (
    guild_id TEXT PRIMARY KEY,
    role_id TEXT,
    enabled INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS autorole_vocal_config (
    guild_id TEXT PRIMARY KEY,
    role_id TEXT,
    exclude_channel_ids TEXT,
    enabled INTEGER NOT NULL
  );
`);

module.exports = db;
