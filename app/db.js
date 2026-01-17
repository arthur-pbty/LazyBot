const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
  path.join(__dirname, process.env.DB_PATH || "database.sqlite"),
  err => {
    if (err) console.error("Erreur DB:", err);
    else console.log("DB SQLite connectée");
  }
);

db.getAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.allAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

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

  CREATE TABLE IF NOT EXISTS economy_config (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    currency_name TEXT NOT NULL DEFAULT 'coins',
    currency_symbol TEXT NOT NULL DEFAULT '💰',
    daily_amount INTEGER NOT NULL DEFAULT 100,
    daily_cooldown_hours INTEGER NOT NULL DEFAULT 24,
    work_min_amount INTEGER NOT NULL DEFAULT 50,
    work_max_amount INTEGER NOT NULL DEFAULT 150,
    work_cooldown_minutes INTEGER NOT NULL DEFAULT 60,
    crime_min_amount INTEGER NOT NULL DEFAULT 100,
    crime_max_amount INTEGER NOT NULL DEFAULT 500,
    crime_success_rate INTEGER NOT NULL DEFAULT 50,
    crime_fine_percent INTEGER NOT NULL DEFAULT 30,
    crime_cooldown_minutes INTEGER NOT NULL DEFAULT 120,
    starting_balance INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS user_economy (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    balance INTEGER NOT NULL DEFAULT 0,
    bank INTEGER NOT NULL DEFAULT 0,
    last_daily_timestamp INTEGER,
    last_work_timestamp INTEGER,
    last_crime_timestamp INTEGER,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS shop_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    role_id TEXT,
    stock INTEGER DEFAULT -1,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    purchased_at INTEGER NOT NULL,
    FOREIGN KEY (item_id) REFERENCES shop_items(id)
  );
`);

module.exports = db;
