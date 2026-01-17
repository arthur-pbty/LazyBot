const express = require("express");
const router = express.Router();
const loadSlashCommands = require("../slash_commands");

module.exports = (app, db, client) => {

  // --- User info ---
  router.get("/user", (req, res) => {
    if (req.session.user) res.json(req.session.user);
    else res.status(401).json({ error: "Utilisateur non connecté" });
  });

  router.get("/guilds", (req, res) => {
    const userGuilds = req.session.guilds;
    if (!userGuilds) return res.status(401).json({ error: "Utilisateur non connecté" });

    const botGuildIds = client.guilds.cache.map(g => g.id);
    const validGuilds = userGuilds.filter(g => {
      const hasAdmin = (g.permissions & 0x8) === 0x8;
      return hasAdmin && botGuildIds.includes(g.id);
    });

    res.json(validGuilds);
  });


  // API pour sauvegarder la configuration de bienvenue
  router.post("/bot/save-welcome-config", express.json(), (req, res) => {
    const { guildId, channelId, welcomeEnabled, welcomeMessage } = req.body;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false });
    }

    const isAdmin = req.session.guilds.find(
      g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
    );

    if (!isAdmin) {
      return res.status(403).json({ success: false });
    }

    db.run(
      `
      INSERT INTO welcome_config (guild_id, channel_id, enabled, message)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id)
      DO UPDATE SET channel_id = ?, enabled = ?, message = ?
      `,
      [
        guildId,
        channelId,
        welcomeEnabled ? 1 : 0,
        welcomeMessage,
        channelId,
        welcomeEnabled ? 1 : 0,
        welcomeMessage
      ],
      err => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false });
        }
        res.json({ success: true });
      }
    );
  });


  router.get("/bot/get-welcome-config/:guildId", (req, res) => {
    const { guildId } = req.params;

    db.get(
      "SELECT enabled, channel_id, message FROM welcome_config WHERE guild_id = ?",
      [guildId],
      (err, row) => {
        if (err || !row) {
          return res.json({ enabled: false, channelId: null, message: "" });
        }
        res.json({
          enabled: !!row.enabled,
          channelId: row.channel_id,
          message: row.message
        });
      }
    );
  });


  router.post("/bot/save-goodbye-config", express.json(), (req, res) => {
    const { guildId, channelId, goodbyeEnabled, goodbyeMessage } = req.body;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false });
    }

    const isAdmin = req.session.guilds.find(
      g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
    );

    if (!isAdmin) {
      return res.status(403).json({ success: false });
    }

    db.run(
      `
      INSERT INTO goodbye_config (guild_id, channel_id, enabled, message)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id)
      DO UPDATE SET channel_id = ?, enabled = ?, message = ?
      `,
      [
        guildId,
        channelId,
        goodbyeEnabled ? 1 : 0,
        goodbyeMessage,
        channelId,
        goodbyeEnabled ? 1 : 0,
        goodbyeMessage
      ],
      err => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false });
        }
        res.json({ success: true });
      }
    );
  });


  router.get("/bot/get-goodbye-config/:guildId", (req, res) => {
    const { guildId } = req.params;

    db.get(
      "SELECT enabled, channel_id, message FROM goodbye_config WHERE guild_id = ?",
      [guildId],
      (err, row) => {
        if (err || !row) {
          return res.json({ enabled: false, channelId: null, message: "" });
        }
        res.json({
          enabled: !!row.enabled,
          channelId: row.channel_id,
          message: row.message
        });
      }
    );
  });


  router.post("/bot/save-autorole-newuser-config", express.json(), (req, res) => {
    const { guildId, roleId, enabled } = req.body;
    console.log("Received autorole-newuser config:", { guildId, roleId, enabled });
    if (!req.session.guilds) {
      return res.status(401).json({ success: false });
    }

    const isAdmin = req.session.guilds.find(
      g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
    );

    if (!isAdmin) {
      return res.status(403).json({ success: false });
    }

    db.run(
      `
      INSERT INTO autorole_newuser_config (guild_id, role_id, enabled)
      VALUES (?, ?, ?)
      ON CONFLICT(guild_id)
      DO UPDATE SET role_id = ?, enabled = ?
      `,
      [
        guildId,
        roleId,
        enabled ? 1 : 0,
        roleId,
        enabled ? 1 : 0
      ],
      err => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false });
        }
        res.json({ success: true });
      }
    );
  });

  router.get("/bot/get-autorole-newuser-config/:guildId", (req, res) => {
    const { guildId } = req.params;

    db.get(
      "SELECT enabled, role_id FROM autorole_newuser_config WHERE guild_id = ?",
      [guildId],
      (err, row) => {
        if (err || !row) {
          return res.json({ enabled: false, roleId: null });
        }
        res.json({
          enabled: !!row.enabled,
          roleId: row.role_id
        });
      }
    );
  });


  router.post("/bot/save-autorole-vocal-config", express.json(), (req, res) => {
    const { guildId, roleId, excludeChannelId, enabled } = req.body;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false });
    }

    const isAdmin = req.session.guilds.find(
      g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
    );

    if (!isAdmin) {
      return res.status(403).json({ success: false });
    }

    const excludeChannelIdArray = Array.isArray(excludeChannelId) ? excludeChannelId : [excludeChannelId];

    db.run(
      `
      INSERT INTO autorole_vocal_config (guild_id, role_id, exclude_channel_ids, enabled)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id)
      DO UPDATE SET role_id = ?, exclude_channel_ids = ?, enabled = ?
      `,
      [
        guildId,
        roleId,
        JSON.stringify(excludeChannelIdArray),
        enabled ? 1 : 0,
        roleId,
        JSON.stringify(excludeChannelIdArray),
        enabled ? 1 : 0
      ],
      err => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false });
        }
        res.json({ success: true });
      }
    );
  });

  router.get("/bot/get-autorole-vocal-config/:guildId", (req, res) => {
    const { guildId } = req.params;

    db.get(
      "SELECT enabled, role_id, exclude_channel_ids FROM autorole_vocal_config WHERE guild_id = ?",
      [guildId],
      (err, row) => {
        if (err || !row) {
          return res.json({ enabled: false, roleId: null });
        }
        res.json({
          enabled: !!row.enabled,
          roleId: row.role_id,
          excludeChannelIds: JSON.parse(row.exclude_channel_ids),
        });
      }
    );
  });


  router.get("/bot/get-text-channels/:guildId", (req, res) => {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ error: "Serveur non trouvé" });
    }

    const channels = guild.channels.cache
      .filter(channel => channel.isTextBased())
      .map(channel => ({
        id: channel.id,
        name: channel.name
      }));

    res.json(channels);
  });


  router.get("/bot/get-voice-channels/:guildId", (req, res) => {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ error: "Serveur non trouvé" });
    }

    const channels = guild.channels.cache
      .filter(channel => channel.isVoiceBased())
      .map(channel => ({
        id: channel.id,
        name: channel.name
      }));

    res.json(channels);
  });


  router.get("/bot/get-roles/:guildId", (req, res) => {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ error: "Serveur non trouvé" });
    }

    const botMember = guild.members.cache.get(client.user.id);
    if (!botMember) return res.status(500).json({ error: "Bot non trouvé dans ce serveur" });

    const botRolePos = botMember.roles.highest.position;

    // On filtre : 
    // - rôle sous le plus haut rôle du bot
    // - pas @everyone
    // - pas managed (roles de bot/intégrations)
    const roles = guild.roles.cache
      .filter(role => 
        role.position < botRolePos && 
        role.name !== "@everyone" && 
        role.managed === false
      )
      .map(role => ({
        id: role.id,
        name: role.name
      }));

    res.json(roles);
  });


  router.get("/bot/get-level-config/:guildId", (req, res) => {
    const { guildId } = req.params;

    db.get(
      `SELECT 
        enabled,
        level_announcements_enabled,
        level_announcements_channel_id,
        level_announcements_message,
        xp_courbe_type,
        multiplier_courbe_for_level,
        level_annoncement_every_level,
        level_max,
        role_with_without_type,
        role_with_without_xp,
        salon_with_without_type,
        salon_with_without_xp,
        gain_xp_on_message,
        gain_xp_message_lower_bound,
        gain_xp_message_upper_bound,
        cooldown_xp_message_seconds,
        gain_xp_on_voice,
        gain_voice_xp_lower_bound,
        gain_voice_xp_upper_bound
      FROM levels_config WHERE guild_id = ?`,
      [guildId],
      (err, row) => {
        if (err || !row) {
          console.error(err);
          return res.json({ 
            enabled: false, 
            levelAnnouncementsEnabled: false,
            levelAnnouncementsChannelId: null,
            levelAnnouncementsMessage: "",
            xpCourbeType: "exponential",
            multiplierCourbeForLevel: 500,
            levelAnnouncementEveryLevel: 1,
            levelMax: 0,
            roleWithWithoutType: "with",
            roleWithWithoutXp: [],
            salonWithWithoutType: "with",
            salonWithWithoutXp: [],
            gainXpOnMessage: false,
            gainXpMessageLowerBound: 15,
            gainXpMessageUpperBound: 25,
            cooldownXpMessageSeconds: 2,
            gainXpOnVoice: false,
            gainVoiceXpLowerBound: 10,
            gainVoiceXpUpperBound: 20
          });
        }
        res.json({
          enabled: !!row.enabled,
          levelAnnouncementsEnabled: !!row.level_announcements_enabled,
          levelAnnouncementsChannelId: row.level_announcements_channel_id,
          levelAnnouncementsMessage: row.level_announcements_message,
          xpCourbeType: row.xp_courbe_type,
          multiplierCourbeForLevel: row.multiplier_courbe_for_level,
          levelAnnouncementEveryLevel: row.level_annoncement_every_level,
          levelMax: row.level_max,
          roleWithWithoutType: row.role_with_without_type,
          roleWithWithoutXp: JSON.parse(row.role_with_without_xp),
          salonWithWithoutType: row.salon_with_without_type,
          salonWithWithoutXp: JSON.parse(row.salon_with_without_xp),
          gainXpOnMessage: !!row.gain_xp_on_message,
          gainXpMessageLowerBound: row.gain_xp_message_lower_bound,
          gainXpMessageUpperBound: row.gain_xp_message_upper_bound,
          cooldownXpMessageSeconds: row.cooldown_xp_message_seconds,
          gainXpOnVoice: !!row.gain_xp_on_voice,
          gainVoiceXpLowerBound: row.gain_voice_xp_lower_bound,
          gainVoiceXpUpperBound: row.gain_voice_xp_upper_bound
        });
      }
    );
  });


  router.post("/bot/save-level-config", express.json(), (req, res) => {
    const {
      guildId,
      levelEnabled,
      levelAnnouncementsEnabled,
      levelAnnouncementsChannelId,
      levelAnnouncementsMessage,
      xpCourbeType,
      multiplierCourbeForLevel,
      levelAnnouncementEveryLevel,
      levelMax,
      roleWithWithoutType,
      roleWithWithoutXp,
      salonWithWithoutType,
      salonWithWithoutXp,
      gainXpOnMessage,
      gainXpMessageLowerBound,
      gainXpMessageUpperBound,
      cooldownXpMessageSeconds,
      gainXpOnVoice,
      gainVoiceXpLowerBound,
      gainVoiceXpUpperBound
    } = req.body;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false });
    }

    const isAdmin = req.session.guilds.find(
      g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
    );

    if (!isAdmin) {
      return res.status(401).json({ success: false });
    }
    db.run(
      `
      INSERT INTO levels_config (
        guild_id,
        enabled,
        level_announcements_enabled,
        level_announcements_channel_id,
        level_announcements_message,
        xp_courbe_type,
        multiplier_courbe_for_level,
        level_annoncement_every_level,
        level_max,
        role_with_without_type,
        role_with_without_xp,
        salon_with_without_type,
        salon_with_without_xp,
        gain_xp_on_message,
        gain_xp_message_lower_bound,
        gain_xp_message_upper_bound,
        cooldown_xp_message_seconds,
        gain_xp_on_voice,
        gain_voice_xp_lower_bound,
        gain_voice_xp_upper_bound
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id)
      DO UPDATE SET
        enabled = ?,
        level_announcements_enabled = ?,
        level_announcements_channel_id = ?,
        level_announcements_message = ?,
        xp_courbe_type = ?,
        multiplier_courbe_for_level = ?,
        level_annoncement_every_level = ?,
        level_max = ?,
        role_with_without_type = ?,
        role_with_without_xp = ?,
        salon_with_without_type = ?,
        salon_with_without_xp = ?,
        gain_xp_on_message = ?,
        gain_xp_message_lower_bound = ?,
        gain_xp_message_upper_bound = ?,
        cooldown_xp_message_seconds = ?,
        gain_xp_on_voice = ?,
        gain_voice_xp_lower_bound = ?,
        gain_voice_xp_upper_bound = ?
      `,
      [
        guildId,
        levelEnabled ? 1 : 0,
        levelAnnouncementsEnabled ? 1 : 0,
        levelAnnouncementsChannelId,
        levelAnnouncementsMessage,
        xpCourbeType,
        multiplierCourbeForLevel,
        levelAnnouncementEveryLevel,
        levelMax,
        roleWithWithoutType,
        JSON.stringify(Array.isArray(roleWithWithoutXp) ? roleWithWithoutXp : [roleWithWithoutXp]),
        salonWithWithoutType,
        JSON.stringify(Array.isArray(salonWithWithoutXp) ? salonWithWithoutXp : [salonWithWithoutXp]),
        gainXpOnMessage ? 1 : 0,
        gainXpMessageLowerBound,
        gainXpMessageUpperBound,
        cooldownXpMessageSeconds,
        gainXpOnVoice ? 1 : 0,
        gainVoiceXpLowerBound,
        gainVoiceXpUpperBound,
        levelEnabled ? 1 : 0,
        levelAnnouncementsEnabled ? 1 : 0,
        levelAnnouncementsChannelId,
        levelAnnouncementsMessage,
        xpCourbeType,
        multiplierCourbeForLevel,
        levelAnnouncementEveryLevel,
        levelMax,
        roleWithWithoutType,
        JSON.stringify(Array.isArray(roleWithWithoutXp) ? roleWithWithoutXp : [roleWithWithoutXp]),
        salonWithWithoutType,
        JSON.stringify(Array.isArray(salonWithWithoutXp) ? salonWithWithoutXp : [salonWithWithoutXp]),
        gainXpOnMessage ? 1 : 0,
        gainXpMessageLowerBound,
        gainXpMessageUpperBound,
        cooldownXpMessageSeconds,
        gainXpOnVoice ? 1 : 0,
        gainVoiceXpLowerBound,
        gainVoiceXpUpperBound
      ],
      err => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false });
        }
        // Reload slash commands for this guild
        loadSlashCommands(client, guildId);
        res.json({ success: true });
      }
    );
  });


  // ============== ECONOMY CONFIG ==============

  router.get("/bot/get-economy-config/:guildId", (req, res) => {
    const { guildId } = req.params;

    // Valeurs par défaut
    const defaults = {
      enabled: false,
      currencyName: "coins",
      currencySymbol: "💰",
      dailyEnabled: true,
      dailyAmount: 100,
      dailyCooldownHours: 24,
      workEnabled: true,
      workMinAmount: 50,
      workMaxAmount: 150,
      workCooldownMinutes: 60,
      crimeEnabled: true,
      crimeMinAmount: 100,
      crimeMaxAmount: 500,
      crimeSuccessRate: 50,
      crimeFinePercent: 30,
      crimeCooldownMinutes: 120,
      stealEnabled: true,
      stealSuccessRate: 40,
      stealMaxPercent: 50,
      stealFinePercent: 25,
      stealCooldownMinutes: 180,
      messageMoneyEnabled: false,
      messageMoneyMin: 1,
      messageMoneyMax: 5,
      messageMoneyCooldownSeconds: 60,
      voiceMoneyEnabled: false,
      voiceMoneyMin: 5,
      voiceMoneyMax: 15,
      voiceMoneyIntervalMinutes: 5,
      startingBalance: 0
    };

    db.get(
      `SELECT * FROM economy_config WHERE guild_id = ?`,
      [guildId],
      (err, row) => {
        if (err || !row) {
          return res.json(defaults);
        }
        res.json({
          enabled: row.enabled != null ? !!row.enabled : defaults.enabled,
          currencyName: row.currency_name ?? defaults.currencyName,
          currencySymbol: row.currency_symbol ?? defaults.currencySymbol,
          dailyEnabled: row.daily_enabled != null ? !!row.daily_enabled : defaults.dailyEnabled,
          dailyAmount: row.daily_amount ?? defaults.dailyAmount,
          dailyCooldownHours: row.daily_cooldown_hours ?? defaults.dailyCooldownHours,
          workEnabled: row.work_enabled != null ? !!row.work_enabled : defaults.workEnabled,
          workMinAmount: row.work_min_amount ?? defaults.workMinAmount,
          workMaxAmount: row.work_max_amount ?? defaults.workMaxAmount,
          workCooldownMinutes: row.work_cooldown_minutes ?? defaults.workCooldownMinutes,
          crimeEnabled: row.crime_enabled != null ? !!row.crime_enabled : defaults.crimeEnabled,
          crimeMinAmount: row.crime_min_amount ?? defaults.crimeMinAmount,
          crimeMaxAmount: row.crime_max_amount ?? defaults.crimeMaxAmount,
          crimeSuccessRate: row.crime_success_rate ?? defaults.crimeSuccessRate,
          crimeFinePercent: row.crime_fine_percent ?? defaults.crimeFinePercent,
          crimeCooldownMinutes: row.crime_cooldown_minutes ?? defaults.crimeCooldownMinutes,
          stealEnabled: row.steal_enabled != null ? !!row.steal_enabled : defaults.stealEnabled,
          stealSuccessRate: row.steal_success_rate ?? defaults.stealSuccessRate,
          stealMaxPercent: row.steal_max_percent ?? defaults.stealMaxPercent,
          stealFinePercent: row.steal_fine_percent ?? defaults.stealFinePercent,
          stealCooldownMinutes: row.steal_cooldown_minutes ?? defaults.stealCooldownMinutes,
          messageMoneyEnabled: row.message_money_enabled != null ? !!row.message_money_enabled : defaults.messageMoneyEnabled,
          messageMoneyMin: row.message_money_min ?? defaults.messageMoneyMin,
          messageMoneyMax: row.message_money_max ?? defaults.messageMoneyMax,
          messageMoneyCooldownSeconds: row.message_money_cooldown_seconds ?? defaults.messageMoneyCooldownSeconds,
          voiceMoneyEnabled: row.voice_money_enabled != null ? !!row.voice_money_enabled : defaults.voiceMoneyEnabled,
          voiceMoneyMin: row.voice_money_min ?? defaults.voiceMoneyMin,
          voiceMoneyMax: row.voice_money_max ?? defaults.voiceMoneyMax,
          voiceMoneyIntervalMinutes: row.voice_money_interval_minutes ?? defaults.voiceMoneyIntervalMinutes,
          startingBalance: row.starting_balance ?? defaults.startingBalance
        });
      }
    );
  });

  router.post("/bot/save-economy-config", express.json(), (req, res) => {
    const {
      guildId,
      economyEnabled,
      currencyName,
      currencySymbol,
      dailyEnabled,
      dailyAmount,
      dailyCooldownHours,
      workEnabled,
      workMinAmount,
      workMaxAmount,
      workCooldownMinutes,
      crimeEnabled,
      crimeMinAmount,
      crimeMaxAmount,
      crimeSuccessRate,
      crimeFinePercent,
      crimeCooldownMinutes,
      stealEnabled,
      stealSuccessRate,
      stealMaxPercent,
      stealFinePercent,
      stealCooldownMinutes,
      messageMoneyEnabled,
      messageMoneyMin,
      messageMoneyMax,
      messageMoneyCooldownSeconds,
      voiceMoneyEnabled,
      voiceMoneyMin,
      voiceMoneyMax,
      voiceMoneyIntervalMinutes,
      startingBalance
    } = req.body;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false });
    }

    const isAdmin = req.session.guilds.find(
      g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
    );

    if (!isAdmin) {
      return res.status(403).json({ success: false });
    }

    db.run(
      `INSERT INTO economy_config (
        guild_id, enabled, currency_name, currency_symbol,
        daily_enabled, daily_amount, daily_cooldown_hours,
        work_enabled, work_min_amount, work_max_amount, work_cooldown_minutes,
        crime_enabled, crime_min_amount, crime_max_amount, crime_success_rate, crime_fine_percent, crime_cooldown_minutes,
        steal_enabled, steal_success_rate, steal_max_percent, steal_fine_percent, steal_cooldown_minutes,
        message_money_enabled, message_money_min, message_money_max, message_money_cooldown_seconds,
        voice_money_enabled, voice_money_min, voice_money_max, voice_money_interval_minutes,
        starting_balance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        enabled = ?, currency_name = ?, currency_symbol = ?,
        daily_enabled = ?, daily_amount = ?, daily_cooldown_hours = ?,
        work_enabled = ?, work_min_amount = ?, work_max_amount = ?, work_cooldown_minutes = ?,
        crime_enabled = ?, crime_min_amount = ?, crime_max_amount = ?, crime_success_rate = ?, crime_fine_percent = ?, crime_cooldown_minutes = ?,
        steal_enabled = ?, steal_success_rate = ?, steal_max_percent = ?, steal_fine_percent = ?, steal_cooldown_minutes = ?,
        message_money_enabled = ?, message_money_min = ?, message_money_max = ?, message_money_cooldown_seconds = ?,
        voice_money_enabled = ?, voice_money_min = ?, voice_money_max = ?, voice_money_interval_minutes = ?,
        starting_balance = ?`,
      [
        guildId,
        economyEnabled ? 1 : 0, currencyName, currencySymbol,
        dailyEnabled ? 1 : 0, dailyAmount, dailyCooldownHours,
        workEnabled ? 1 : 0, workMinAmount, workMaxAmount, workCooldownMinutes,
        crimeEnabled ? 1 : 0, crimeMinAmount, crimeMaxAmount, crimeSuccessRate, crimeFinePercent, crimeCooldownMinutes,
        stealEnabled ? 1 : 0, stealSuccessRate, stealMaxPercent, stealFinePercent, stealCooldownMinutes,
        messageMoneyEnabled ? 1 : 0, messageMoneyMin, messageMoneyMax, messageMoneyCooldownSeconds,
        voiceMoneyEnabled ? 1 : 0, voiceMoneyMin, voiceMoneyMax, voiceMoneyIntervalMinutes,
        startingBalance,
        economyEnabled ? 1 : 0, currencyName, currencySymbol,
        dailyEnabled ? 1 : 0, dailyAmount, dailyCooldownHours,
        workEnabled ? 1 : 0, workMinAmount, workMaxAmount, workCooldownMinutes,
        crimeEnabled ? 1 : 0, crimeMinAmount, crimeMaxAmount, crimeSuccessRate, crimeFinePercent, crimeCooldownMinutes,
        stealEnabled ? 1 : 0, stealSuccessRate, stealMaxPercent, stealFinePercent, stealCooldownMinutes,
        messageMoneyEnabled ? 1 : 0, messageMoneyMin, messageMoneyMax, messageMoneyCooldownSeconds,
        voiceMoneyEnabled ? 1 : 0, voiceMoneyMin, voiceMoneyMax, voiceMoneyIntervalMinutes,
        startingBalance
      ],
      err => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false });
        }
        loadSlashCommands(client, guildId);
        res.json({ success: true });
      }
    );
  });

  app.use("/api", router);
};
