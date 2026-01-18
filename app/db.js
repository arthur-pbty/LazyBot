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

  CREATE TABLE IF NOT EXISTS logs_config (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    category_id TEXT,
    moderation_enabled INTEGER NOT NULL DEFAULT 0,
    moderation_channel_id TEXT,
    voice_enabled INTEGER NOT NULL DEFAULT 0,
    voice_channel_id TEXT,
    messages_enabled INTEGER NOT NULL DEFAULT 0,
    messages_channel_id TEXT,
    members_enabled INTEGER NOT NULL DEFAULT 0,
    members_channel_id TEXT,
    channels_enabled INTEGER NOT NULL DEFAULT 0,
    channels_channel_id TEXT,
    roles_enabled INTEGER NOT NULL DEFAULT 0,
    roles_channel_id TEXT,
    invites_enabled INTEGER NOT NULL DEFAULT 0,
    invites_channel_id TEXT,
    server_enabled INTEGER NOT NULL DEFAULT 0,
    server_channel_id TEXT
  );

  CREATE TABLE IF NOT EXISTS username_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    changed_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_username_history_user ON username_history(user_id, changed_at DESC);

  CREATE TABLE IF NOT EXISTS nickname_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    nickname TEXT,
    changed_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_nickname_history_user ON nickname_history(guild_id, user_id, changed_at DESC);

  CREATE TABLE IF NOT EXISTS antiraid_config (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    log_channel_id TEXT,
    
    -- Anti-link
    antilink_enabled INTEGER NOT NULL DEFAULT 0,
    antilink_action TEXT NOT NULL DEFAULT 'delete',
    antilink_whitelist_domains TEXT DEFAULT '[]',
    antilink_exclude_channels TEXT DEFAULT '[]',
    antilink_exclude_roles TEXT DEFAULT '[]',
    antilink_warn_message TEXT DEFAULT '⚠️ Les liens ne sont pas autorisés ici.',
    
    -- Anti-invite (liens Discord)
    antiinvite_enabled INTEGER NOT NULL DEFAULT 0,
    antiinvite_action TEXT NOT NULL DEFAULT 'delete',
    antiinvite_allow_own_server INTEGER NOT NULL DEFAULT 1,
    antiinvite_exclude_channels TEXT DEFAULT '[]',
    antiinvite_exclude_roles TEXT DEFAULT '[]',
    
    -- Anti-spam
    antispam_enabled INTEGER NOT NULL DEFAULT 0,
    antispam_action TEXT NOT NULL DEFAULT 'mute',
    antispam_max_messages INTEGER NOT NULL DEFAULT 5,
    antispam_interval_seconds INTEGER NOT NULL DEFAULT 5,
    antispam_mute_duration_minutes INTEGER NOT NULL DEFAULT 10,
    antispam_exclude_channels TEXT DEFAULT '[]',
    antispam_exclude_roles TEXT DEFAULT '[]',
    
    -- Anti-duplicate (messages identiques)
    antidupe_enabled INTEGER NOT NULL DEFAULT 0,
    antidupe_action TEXT NOT NULL DEFAULT 'delete',
    antidupe_max_duplicates INTEGER NOT NULL DEFAULT 3,
    antidupe_interval_seconds INTEGER NOT NULL DEFAULT 60,
    antidupe_exclude_channels TEXT DEFAULT '[]',
    antidupe_exclude_roles TEXT DEFAULT '[]',
    
    -- Anti-mass mention
    antimention_enabled INTEGER NOT NULL DEFAULT 0,
    antimention_action TEXT NOT NULL DEFAULT 'delete',
    antimention_max_mentions INTEGER NOT NULL DEFAULT 5,
    antimention_exclude_channels TEXT DEFAULT '[]',
    antimention_exclude_roles TEXT DEFAULT '[]',
    
    -- Anti-mass emoji
    antiemoji_enabled INTEGER NOT NULL DEFAULT 0,
    antiemoji_action TEXT NOT NULL DEFAULT 'delete',
    antiemoji_max_emojis INTEGER NOT NULL DEFAULT 10,
    antiemoji_exclude_channels TEXT DEFAULT '[]',
    antiemoji_exclude_roles TEXT DEFAULT '[]',
    
    -- Anti-caps (majuscules)
    anticaps_enabled INTEGER NOT NULL DEFAULT 0,
    anticaps_action TEXT NOT NULL DEFAULT 'delete',
    anticaps_max_percent INTEGER NOT NULL DEFAULT 70,
    anticaps_min_length INTEGER NOT NULL DEFAULT 10,
    anticaps_exclude_channels TEXT DEFAULT '[]',
    anticaps_exclude_roles TEXT DEFAULT '[]',
    
    -- Anti-bot join
    antibot_enabled INTEGER NOT NULL DEFAULT 0,
    antibot_action TEXT NOT NULL DEFAULT 'kick',
    antibot_min_account_age_days INTEGER NOT NULL DEFAULT 7,
    antibot_no_avatar_action INTEGER NOT NULL DEFAULT 0,
    antibot_suspicious_name_action INTEGER NOT NULL DEFAULT 0,
    
    -- Anti-mass join (raid de comptes)
    antimassj_enabled INTEGER NOT NULL DEFAULT 0,
    antimassj_action TEXT NOT NULL DEFAULT 'kick',
    antimassj_max_joins INTEGER NOT NULL DEFAULT 10,
    antimassj_interval_seconds INTEGER NOT NULL DEFAULT 10,
    antimassj_lockdown_duration_minutes INTEGER NOT NULL DEFAULT 5,
    
    -- Anti-newline spam
    antinewline_enabled INTEGER NOT NULL DEFAULT 0,
    antinewline_action TEXT NOT NULL DEFAULT 'delete',
    antinewline_max_lines INTEGER NOT NULL DEFAULT 15,
    antinewline_exclude_channels TEXT DEFAULT '[]',
    antinewline_exclude_roles TEXT DEFAULT '[]',
    
    -- Anti-badwords (gros mots)
    antibadwords_enabled INTEGER NOT NULL DEFAULT 0,
    antibadwords_action TEXT NOT NULL DEFAULT 'delete',
    antibadwords_words TEXT DEFAULT '[]',
    antibadwords_exclude_channels TEXT DEFAULT '[]',
    antibadwords_exclude_roles TEXT DEFAULT '[]',
    antibadwords_warn_message TEXT DEFAULT '⚠️ Les insultes et gros mots ne sont pas autorisés.'
  );

  CREATE TABLE IF NOT EXISTS antiraid_warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    warning_type TEXT NOT NULL,
    warned_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_antiraid_warnings ON antiraid_warnings(guild_id, user_id, warning_type, warned_at);

  -- Table des warns utilisateurs
  CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    source TEXT DEFAULT 'manual',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_warnings ON warnings(guild_id, user_id, created_at DESC);

  -- Configuration des sanctions automatiques par warns
  CREATE TABLE IF NOT EXISTS warnings_config (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,
    warn1_action TEXT DEFAULT 'none',
    warn1_duration INTEGER DEFAULT 10,
    warn2_action TEXT DEFAULT 'none',
    warn2_duration INTEGER DEFAULT 30,
    warn3_action TEXT DEFAULT 'mute',
    warn3_duration INTEGER DEFAULT 60,
    warn4_action TEXT DEFAULT 'kick',
    warn4_duration INTEGER DEFAULT 0,
    warn5_action TEXT DEFAULT 'ban',
    warn5_duration INTEGER DEFAULT 0,
    decay_enabled INTEGER NOT NULL DEFAULT 0,
    decay_days INTEGER DEFAULT 30,
    notify_user INTEGER NOT NULL DEFAULT 1,
    notify_channel_id TEXT
  );

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
