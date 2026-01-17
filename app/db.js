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

  CREATE TABLE IF NOT EXISTS levels_config (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL,
    level_announcements_enabled INTEGER NOT NULL,
    level_announcements_channel_id TEXT,
    level_announcements_message TEXT NOT NULL,
    xp_courbe_type TEXT NOT NULL,
    multiplier_courbe_for_level INTEGER NOT NULL,
    level_annoncement_every_level INTEGER NOT NULL,
    level_max INTEGER NOT NULL,
    role_with_without_type TEXT NOT NULL,
    role_with_without_xp TEXT NOT NULL,
    salon_with_without_type TEXT NOT NULL,
    salon_with_without_xp TEXT NOT NULL,
    gain_xp_on_message INTEGER NOT NULL,
    gain_xp_message_lower_bound INTEGER NOT NULL,
    gain_xp_message_upper_bound INTEGER NOT NULL,
    cooldown_xp_message_seconds INTEGER NOT NULL,
    gain_xp_on_voice INTEGER NOT NULL,
    gain_voice_xp_lower_bound INTEGER NOT NULL,
    gain_voice_xp_upper_bound INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_levels (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    xp INTEGER NOT NULL,
    level INTEGER NOT NULL,
    last_xp_message_timestamp INTEGER,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS prefix (
    guildId TEXT NOT NULL,
    prefix TEXT NOT NULL DEFAULT '!',
    PRIMARY KEY (guildId)
  );
`);

module.exports = db;
