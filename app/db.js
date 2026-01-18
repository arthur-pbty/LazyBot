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
    daily_enabled INTEGER NOT NULL DEFAULT 1,
    daily_amount INTEGER NOT NULL DEFAULT 100,
    daily_cooldown_hours INTEGER NOT NULL DEFAULT 24,
    work_enabled INTEGER NOT NULL DEFAULT 1,
    work_min_amount INTEGER NOT NULL DEFAULT 50,
    work_max_amount INTEGER NOT NULL DEFAULT 150,
    work_cooldown_minutes INTEGER NOT NULL DEFAULT 60,
    crime_enabled INTEGER NOT NULL DEFAULT 1,
    crime_min_amount INTEGER NOT NULL DEFAULT 100,
    crime_max_amount INTEGER NOT NULL DEFAULT 500,
    crime_success_rate INTEGER NOT NULL DEFAULT 50,
    crime_fine_percent INTEGER NOT NULL DEFAULT 30,
    crime_cooldown_minutes INTEGER NOT NULL DEFAULT 120,
    steal_enabled INTEGER NOT NULL DEFAULT 1,
    steal_success_rate INTEGER NOT NULL DEFAULT 40,
    steal_max_percent INTEGER NOT NULL DEFAULT 50,
    steal_fine_percent INTEGER NOT NULL DEFAULT 25,
    steal_cooldown_minutes INTEGER NOT NULL DEFAULT 180,
    message_money_enabled INTEGER NOT NULL DEFAULT 0,
    message_money_min INTEGER NOT NULL DEFAULT 1,
    message_money_max INTEGER NOT NULL DEFAULT 5,
    message_money_cooldown_seconds INTEGER NOT NULL DEFAULT 60,
    voice_money_enabled INTEGER NOT NULL DEFAULT 0,
    voice_money_min INTEGER NOT NULL DEFAULT 5,
    voice_money_max INTEGER NOT NULL DEFAULT 15,
    voice_money_interval_minutes INTEGER NOT NULL DEFAULT 5,
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
    last_steal_timestamp INTEGER,
    last_message_money_timestamp INTEGER,
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

  CREATE TABLE IF NOT EXISTS privateroom_config (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    creator_channel_id TEXT,
    category_id TEXT,
    channel_name_format TEXT NOT NULL DEFAULT '🔊 Salon de {user}'
  );

  CREATE TABLE IF NOT EXISTS temp_voice_channels (
    channel_id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS counting_config (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    channel_id TEXT,
    current_count INTEGER NOT NULL DEFAULT 0,
    last_user_id TEXT
  );

  CREATE TABLE IF NOT EXISTS stats_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    stat_type TEXT NOT NULL,
    role_id TEXT,
    format TEXT NOT NULL DEFAULT '{stat}',
    UNIQUE(guild_id, channel_id)
  );

  CREATE TABLE IF NOT EXISTS user_activity_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    stat_type TEXT NOT NULL,
    value INTEGER NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    UNIQUE(guild_id, user_id, stat_type, date)
  );

  CREATE TABLE IF NOT EXISTS voice_sessions (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    join_timestamp INTEGER NOT NULL,
    PRIMARY KEY(guild_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_user_activity_stats_date ON user_activity_stats(guild_id, user_id, date);

  CREATE TABLE IF NOT EXISTS scheduled_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_content TEXT NOT NULL,
    embed_enabled INTEGER NOT NULL DEFAULT 0,
    embed_title TEXT,
    embed_description TEXT,
    embed_color TEXT DEFAULT '#5865F2',
    schedule_type TEXT NOT NULL DEFAULT 'weekly',
    days_of_week TEXT DEFAULT '[]',
    times_of_day TEXT DEFAULT '[]',
    interval_value INTEGER DEFAULT 60,
    interval_unit TEXT DEFAULT 'minutes',
    force_send INTEGER NOT NULL DEFAULT 1,
    delete_previous INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_sent_at INTEGER,
    last_message_id TEXT,
    last_channel_activity INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );
`);

module.exports = db;
