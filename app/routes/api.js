const express = require("express");
const router = express.Router();
const loadSlashCommands = require("../slash_commands");

module.exports = (app, db, client) => {

  // --- Bot info ---
  router.get("/bot-info", (req, res) => {
    const bot = client.user;
    if (!bot) return res.status(500).json({ error: "Bot non connecté" });
    
    let userCount = 0;
    client.guilds.cache.forEach(g => {
      userCount += g.memberCount;
    });

    res.json({
      id: bot.id,
      username: bot.username,
      discriminator: bot.discriminator,
      avatar: bot.avatar,
      guildCount: client.guilds.cache.size,
      userCount: userCount
    });
  });

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

  // ===== PRIVATE ROOM CONFIG =====
  router.post("/bot/save-privateroom-config", express.json(), (req, res) => {
    const { guildId, enabled, creatorChannelId, categoryId, channelNameFormat } = req.body;

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
      `INSERT INTO privateroom_config (guild_id, enabled, creator_channel_id, category_id, channel_name_format)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET
         enabled = ?, creator_channel_id = ?, category_id = ?, channel_name_format = ?`,
      [
        guildId,
        enabled ? 1 : 0,
        creatorChannelId,
        categoryId,
        channelNameFormat || '🔊 Salon de {user}',
        enabled ? 1 : 0,
        creatorChannelId,
        categoryId,
        channelNameFormat || '🔊 Salon de {user}'
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

  router.get("/bot/get-privateroom-config/:guildId", (req, res) => {
    const { guildId } = req.params;

    db.get(
      "SELECT enabled, creator_channel_id, category_id, channel_name_format FROM privateroom_config WHERE guild_id = ?",
      [guildId],
      (err, row) => {
        if (err || !row) {
          return res.json({
            enabled: false,
            creatorChannelId: null,
            categoryId: null,
            channelNameFormat: '🔊 Salon de {user}'
          });
        }
        res.json({
          enabled: !!row.enabled,
          creatorChannelId: row.creator_channel_id,
          categoryId: row.category_id,
          channelNameFormat: row.channel_name_format || '🔊 Salon de {user}'
        });
      }
    );
  });

  router.get("/bot/get-categories/:guildId", (req, res) => {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({ error: "Serveur non trouvé" });
    }

    const categories = guild.channels.cache
      .filter(c => c.type === 4) // 4 = GuildCategory
      .map(c => ({ id: c.id, name: c.name }));

    res.json(categories);
  });

  // ===== COUNTING CONFIG =====
  router.post("/bot/save-counting-config", express.json(), (req, res) => {
    const { guildId, enabled, channelId } = req.body;

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
      `INSERT INTO counting_config (guild_id, enabled, channel_id, current_count, last_user_id)
       VALUES (?, ?, ?, 0, NULL)
       ON CONFLICT(guild_id) DO UPDATE SET
         enabled = ?, channel_id = ?`,
      [
        guildId,
        enabled ? 1 : 0,
        channelId,
        enabled ? 1 : 0,
        channelId
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

  router.get("/bot/get-counting-config/:guildId", (req, res) => {
    const { guildId } = req.params;

    db.get(
      "SELECT enabled, channel_id, current_count FROM counting_config WHERE guild_id = ?",
      [guildId],
      (err, row) => {
        if (err || !row) {
          return res.json({
            enabled: false,
            channelId: null,
            currentCount: 0
          });
        }
        res.json({
          enabled: !!row.enabled,
          channelId: row.channel_id,
          currentCount: row.current_count || 0
        });
      }
    );
  });

  // ===== STATS CHANNELS =====
  router.get("/bot/get-stats-channels/:guildId", (req, res) => {
    const { guildId } = req.params;

    db.all(
      "SELECT id, channel_id, stat_type, role_id, format FROM stats_channels WHERE guild_id = ?",
      [guildId],
      (err, rows) => {
        if (err) {
          console.error(err);
          return res.json([]);
        }
        res.json(rows || []);
      }
    );
  });

  router.post("/bot/add-stats-channel", express.json(), (req, res) => {
    const { guildId, channelId, statType, roleId, format } = req.body;

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
      `INSERT INTO stats_channels (guild_id, channel_id, stat_type, role_id, format)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(guild_id, channel_id) DO UPDATE SET
         stat_type = ?, role_id = ?, format = ?`,
      [guildId, channelId, statType, roleId || null, format || '{stat}', statType, roleId || null, format || '{stat}'],
      async function(err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false });
        }
        
        // Mettre à jour le salon immédiatement
        try {
          const client = require("../bot");
          if (client.updateGuildStats) {
            await client.updateGuildStats(guildId, [statType]);
          }
        } catch (e) {
          console.error("Erreur mise à jour stats:", e);
        }
        
        res.json({ success: true, id: this.lastID });
      }
    );
  });

  router.delete("/bot/delete-stats-channel/:id", (req, res) => {
    const { id } = req.params;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false });
    }

    db.run("DELETE FROM stats_channels WHERE id = ?", [id], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false });
      }
      res.json({ success: true });
    });
  });

  // ===== SCHEDULED MESSAGES =====

  // Récupérer tous les messages programmés d'un serveur
  router.get("/bot/get-scheduled-messages/:guildId", (req, res) => {
    const { guildId } = req.params;

    if (!req.session.guilds) {
      return res.status(401).json([]);
    }

    const isAdmin = req.session.guilds.find(
      g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
    );

    if (!isAdmin) {
      return res.status(403).json([]);
    }

    db.all(
      "SELECT * FROM scheduled_messages WHERE guild_id = ? ORDER BY created_at DESC",
      [guildId],
      (err, rows) => {
        if (err) {
          console.error(err);
          return res.status(500).json([]);
        }
        res.json(rows || []);
      }
    );
  });

  // Ajouter un message programmé
  router.post("/bot/add-scheduled-message", express.json(), (req, res) => {
    const { 
      guildId, channelId, messageContent, 
      embedEnabled, embedTitle, embedDescription, embedColor,
      scheduleType, daysOfWeek, timesOfDay, intervalValue, intervalUnit,
      forceSend, deletePrevious, enabled 
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
      `INSERT INTO scheduled_messages (
        guild_id, channel_id, message_content,
        embed_enabled, embed_title, embed_description, embed_color,
        schedule_type, days_of_week, times_of_day, interval_value, interval_unit,
        force_send, delete_previous, enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        guildId, channelId, messageContent || '',
        embedEnabled ? 1 : 0, embedTitle || null, embedDescription || null, embedColor || '#5865F2',
        scheduleType || 'weekly', 
        JSON.stringify(daysOfWeek || []), 
        JSON.stringify(timesOfDay || []),
        intervalValue || 60, intervalUnit || 'minutes',
        forceSend ? 1 : 0, deletePrevious ? 1 : 0, enabled ? 1 : 0
      ],
      function(err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false });
        }
        res.json({ success: true, id: this.lastID });
      }
    );
  });

  // Modifier un message programmé
  router.put("/bot/update-scheduled-message/:id", express.json(), (req, res) => {
    const { id } = req.params;
    const { 
      channelId, messageContent, 
      embedEnabled, embedTitle, embedDescription, embedColor,
      scheduleType, daysOfWeek, timesOfDay, intervalValue, intervalUnit,
      forceSend, deletePrevious, enabled 
    } = req.body;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false });
    }

    db.run(
      `UPDATE scheduled_messages SET
        channel_id = ?, message_content = ?,
        embed_enabled = ?, embed_title = ?, embed_description = ?, embed_color = ?,
        schedule_type = ?, days_of_week = ?, times_of_day = ?, interval_value = ?, interval_unit = ?,
        force_send = ?, delete_previous = ?, enabled = ?
      WHERE id = ?`,
      [
        channelId, messageContent || '',
        embedEnabled ? 1 : 0, embedTitle || null, embedDescription || null, embedColor || '#5865F2',
        scheduleType || 'weekly', 
        JSON.stringify(daysOfWeek || []), 
        JSON.stringify(timesOfDay || []),
        intervalValue || 60, intervalUnit || 'minutes',
        forceSend ? 1 : 0, deletePrevious ? 1 : 0, enabled ? 1 : 0,
        id
      ],
      (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false });
        }
        res.json({ success: true });
      }
    );
  });

  // Supprimer un message programmé
  router.delete("/bot/delete-scheduled-message/:id", (req, res) => {
    const { id } = req.params;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false });
    }

    db.run("DELETE FROM scheduled_messages WHERE id = ?", [id], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false });
      }
      res.json({ success: true });
    });
  });

  // Toggle enabled/disabled
  router.patch("/bot/toggle-scheduled-message/:id", (req, res) => {
    const { id } = req.params;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false });
    }

    db.run(
      "UPDATE scheduled_messages SET enabled = NOT enabled WHERE id = ?",
      [id],
      (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false });
        }
        res.json({ success: true });
      }
    );
  });

  // Envoyer un message instantané
  router.post("/bot/send-message", express.json(), async (req, res) => {
    const { guildId, channelId, content, embed } = req.body;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false, error: "Non connecté" });
    }

    const isAdmin = req.session.guilds.find(
      g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
    );

    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Permission refusée" });
    }

    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ success: false, error: "Serveur non trouvé" });
      }

      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        return res.status(404).json({ success: false, error: "Salon non trouvé" });
      }

      // Build message options
      const messageOptions = {};

      if (content) {
        messageOptions.content = content;
      }

      if (embed) {
        const { EmbedBuilder } = require("discord.js");
        const embedBuilder = new EmbedBuilder();

        if (embed.title) embedBuilder.setTitle(embed.title);
        if (embed.description) embedBuilder.setDescription(embed.description);
        if (embed.color) embedBuilder.setColor(embed.color);
        
        if (embed.author && embed.author.name) {
          embedBuilder.setAuthor({
            name: embed.author.name,
            url: embed.author.url || undefined,
            iconURL: embed.author.icon_url || undefined
          });
        }

        if (embed.thumbnail && embed.thumbnail.url) {
          embedBuilder.setThumbnail(embed.thumbnail.url);
        }

        if (embed.image && embed.image.url) {
          embedBuilder.setImage(embed.image.url);
        }

        if (embed.footer && embed.footer.text) {
          embedBuilder.setFooter({
            text: embed.footer.text,
            iconURL: embed.footer.icon_url || undefined
          });
        }

        if (embed.timestamp) {
          embedBuilder.setTimestamp();
        }

        if (embed.fields && embed.fields.length > 0) {
          embed.fields.forEach(field => {
            if (field.name && field.value) {
              embedBuilder.addFields({
                name: field.name,
                value: field.value,
                inline: field.inline || false
              });
            }
          });
        }

        messageOptions.embeds = [embedBuilder];
      }

      await channel.send(messageOptions);
      res.json({ success: true });

    } catch (err) {
      console.error("Erreur envoi message:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ===== BOT APPEARANCE =====

  // Obtenir les infos d'apparence du bot
  router.get("/bot/get-bot-appearance/:guildId", async (req, res) => {
    const { guildId } = req.params;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false, error: "Non connecté" });
    }

    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ success: false, error: "Serveur non trouvé" });
      }

      const botMember = guild.members.me;
      const bot = client.user;

      res.json({
        success: true,
        username: bot.username,
        nickname: botMember?.nickname || null,
        avatarUrl: bot.displayAvatarURL({ size: 256 }),
        discriminator: bot.discriminator
      });

    } catch (err) {
      console.error("Erreur get bot appearance:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Changer le pseudo du bot sur un serveur
  router.post("/bot/set-nickname", express.json(), async (req, res) => {
    const { guildId, nickname } = req.body;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false, error: "Non connecté" });
    }

    const isAdmin = req.session.guilds.find(
      g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
    );

    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Permission refusée" });
    }

    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ success: false, error: "Serveur non trouvé" });
      }

      const botMember = guild.members.me;
      await botMember.setNickname(nickname || null);

      res.json({ success: true });

    } catch (err) {
      console.error("Erreur set nickname:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ===== LOGS SYSTEM =====

  // Types de logs disponibles
  const LOG_TYPES = [
    { key: 'moderation', name: '📋 Modération', channelName: '📋・moderation-logs', description: 'Bans, kicks, timeouts, warns' },
    { key: 'voice', name: '🔊 Vocal', channelName: '🔊・voice-logs', description: 'Connexions/déconnexions vocales' },
    { key: 'messages', name: '💬 Messages', channelName: '💬・messages-logs', description: 'Messages édités/supprimés' },
    { key: 'members', name: '👥 Membres', channelName: '👥・members-logs', description: 'Arrivées/départs, rôles, pseudos' },
    { key: 'channels', name: '📁 Salons', channelName: '📁・channels-logs', description: 'Création/suppression de salons' },
    { key: 'roles', name: '🎭 Rôles', channelName: '🎭・roles-logs', description: 'Création/modification de rôles' },
    { key: 'invites', name: '🔗 Invitations', channelName: '🔗・invites-logs', description: 'Création/utilisation d\'invitations' },
    { key: 'server', name: '⚙️ Serveur', channelName: '⚙️・server-logs', description: 'Modifications du serveur' }
  ];

  // Obtenir la config des logs
  router.get("/bot/get-logs-config/:guildId", async (req, res) => {
    const { guildId } = req.params;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false, error: "Non connecté" });
    }

    try {
      const row = await db.getAsync(
        "SELECT * FROM logs_config WHERE guild_id = ?",
        [guildId]
      );

      const guild = client.guilds.cache.get(guildId);
      const categories = guild ? guild.channels.cache
        .filter(c => c.type === 4)
        .map(c => ({ id: c.id, name: c.name })) : [];

      res.json({
        success: true,
        config: row || { enabled: false },
        categories,
        logTypes: LOG_TYPES
      });

    } catch (err) {
      console.error("Erreur get logs config:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Sauvegarder la config des logs ET créer les salons
  router.post("/bot/save-logs-config", express.json(), async (req, res) => {
    const { guildId, enabled, categoryId, enabledLogs } = req.body;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false, error: "Non connecté" });
    }

    const isAdmin = req.session.guilds.find(
      g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
    );

    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Permission refusée" });
    }

    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ success: false, error: "Serveur non trouvé" });
      }

      // Récupérer l'ancienne config
      let oldConfig = await db.getAsync("SELECT * FROM logs_config WHERE guild_id = ?", [guildId]);

      // Préparer les nouvelles valeurs
      const newConfig = {
        guild_id: guildId,
        enabled: enabled ? 1 : 0,
        category_id: categoryId || null,
        moderation_enabled: 0, moderation_channel_id: oldConfig?.moderation_channel_id || null,
        voice_enabled: 0, voice_channel_id: oldConfig?.voice_channel_id || null,
        messages_enabled: 0, messages_channel_id: oldConfig?.messages_channel_id || null,
        members_enabled: 0, members_channel_id: oldConfig?.members_channel_id || null,
        channels_enabled: 0, channels_channel_id: oldConfig?.channels_channel_id || null,
        roles_enabled: 0, roles_channel_id: oldConfig?.roles_channel_id || null,
        invites_enabled: 0, invites_channel_id: oldConfig?.invites_channel_id || null,
        server_enabled: 0, server_channel_id: oldConfig?.server_channel_id || null
      };

      // Créer/récupérer la catégorie si pas déjà sélectionnée
      let category;
      if (categoryId) {
        category = guild.channels.cache.get(categoryId);
      } else if (enabled && enabledLogs && enabledLogs.length > 0) {
        // Créer une nouvelle catégorie pour les logs
        category = await guild.channels.create({
          name: '📜 LOGS',
          type: 4, // CategoryChannel
          permissionOverwrites: [
            {
              id: guild.id,
              deny: ['ViewChannel']
            },
            {
              id: client.user.id,
              allow: ['ViewChannel', 'SendMessages', 'EmbedLinks']
            }
          ]
        });
        newConfig.category_id = category.id;
      }

      // Pour chaque type de log activé, créer le salon si nécessaire
      if (enabled && enabledLogs && category) {
        for (const logKey of enabledLogs) {
          const logType = LOG_TYPES.find(lt => lt.key === logKey);
          if (!logType) continue;

          const enabledField = `${logKey}_enabled`;
          const channelField = `${logKey}_channel_id`;
          
          newConfig[enabledField] = 1;

          // Vérifier si le salon existe déjà
          let existingChannel = newConfig[channelField] ? 
            guild.channels.cache.get(newConfig[channelField]) : null;

          if (!existingChannel) {
            // Créer le salon
            const newChannel = await guild.channels.create({
              name: logType.channelName,
              type: 0, // TextChannel
              parent: category.id,
              permissionOverwrites: [
                {
                  id: guild.id,
                  deny: ['ViewChannel']
                },
                {
                  id: client.user.id,
                  allow: ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles']
                }
              ]
            });
            newConfig[channelField] = newChannel.id;
          }
        }
      }

      // Désactiver les logs non sélectionnés (mais garder les salons)
      if (enabledLogs) {
        for (const logType of LOG_TYPES) {
          if (!enabledLogs.includes(logType.key)) {
            newConfig[`${logType.key}_enabled`] = 0;
          }
        }
      }

      // Sauvegarder en base
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO logs_config (
            guild_id, enabled, category_id,
            moderation_enabled, moderation_channel_id,
            voice_enabled, voice_channel_id,
            messages_enabled, messages_channel_id,
            members_enabled, members_channel_id,
            channels_enabled, channels_channel_id,
            roles_enabled, roles_channel_id,
            invites_enabled, invites_channel_id,
            server_enabled, server_channel_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(guild_id) DO UPDATE SET
            enabled = ?, category_id = ?,
            moderation_enabled = ?, moderation_channel_id = ?,
            voice_enabled = ?, voice_channel_id = ?,
            messages_enabled = ?, messages_channel_id = ?,
            members_enabled = ?, members_channel_id = ?,
            channels_enabled = ?, channels_channel_id = ?,
            roles_enabled = ?, roles_channel_id = ?,
            invites_enabled = ?, invites_channel_id = ?,
            server_enabled = ?, server_channel_id = ?
        `, [
          newConfig.guild_id, newConfig.enabled, newConfig.category_id,
          newConfig.moderation_enabled, newConfig.moderation_channel_id,
          newConfig.voice_enabled, newConfig.voice_channel_id,
          newConfig.messages_enabled, newConfig.messages_channel_id,
          newConfig.members_enabled, newConfig.members_channel_id,
          newConfig.channels_enabled, newConfig.channels_channel_id,
          newConfig.roles_enabled, newConfig.roles_channel_id,
          newConfig.invites_enabled, newConfig.invites_channel_id,
          newConfig.server_enabled, newConfig.server_channel_id,
          // ON CONFLICT values
          newConfig.enabled, newConfig.category_id,
          newConfig.moderation_enabled, newConfig.moderation_channel_id,
          newConfig.voice_enabled, newConfig.voice_channel_id,
          newConfig.messages_enabled, newConfig.messages_channel_id,
          newConfig.members_enabled, newConfig.members_channel_id,
          newConfig.channels_enabled, newConfig.channels_channel_id,
          newConfig.roles_enabled, newConfig.roles_channel_id,
          newConfig.invites_enabled, newConfig.invites_channel_id,
          newConfig.server_enabled, newConfig.server_channel_id
        ], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ 
        success: true, 
        categoryId: newConfig.category_id,
        channels: {
          moderation: newConfig.moderation_channel_id,
          voice: newConfig.voice_channel_id,
          messages: newConfig.messages_channel_id,
          members: newConfig.members_channel_id,
          channels: newConfig.channels_channel_id,
          roles: newConfig.roles_channel_id,
          invites: newConfig.invites_channel_id,
          server: newConfig.server_channel_id
        }
      });

    } catch (err) {
      console.error("Erreur save logs config:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Supprimer tous les salons de logs
  router.post("/bot/delete-logs-channels", express.json(), async (req, res) => {
    const { guildId } = req.body;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false, error: "Non connecté" });
    }

    const isAdmin = req.session.guilds.find(
      g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
    );

    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Permission refusée" });
    }

    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ success: false, error: "Serveur non trouvé" });
      }

      const config = await db.getAsync("SELECT * FROM logs_config WHERE guild_id = ?", [guildId]);
      if (!config) {
        return res.json({ success: true });
      }

      // Supprimer tous les salons de logs
      const channelIds = [
        config.moderation_channel_id,
        config.voice_channel_id,
        config.messages_channel_id,
        config.members_channel_id,
        config.channels_channel_id,
        config.roles_channel_id,
        config.invites_channel_id,
        config.server_channel_id
      ].filter(Boolean);

      for (const channelId of channelIds) {
        const channel = guild.channels.cache.get(channelId);
        if (channel) {
          try {
            await channel.delete("Suppression du système de logs");
          } catch (e) {
            console.error(`Erreur suppression salon ${channelId}:`, e.message);
          }
        }
      }

      // Supprimer la catégorie si elle a été créée par le bot
      if (config.category_id) {
        const category = guild.channels.cache.get(config.category_id);
        if (category && category.children.cache.size === 0) {
          try {
            await category.delete("Suppression du système de logs");
          } catch (e) {
            console.error(`Erreur suppression catégorie:`, e.message);
          }
        }
      }

      // Reset la config en base
      await new Promise((resolve, reject) => {
        db.run(`
          UPDATE logs_config SET
            enabled = 0, category_id = NULL,
            moderation_enabled = 0, moderation_channel_id = NULL,
            voice_enabled = 0, voice_channel_id = NULL,
            messages_enabled = 0, messages_channel_id = NULL,
            members_enabled = 0, members_channel_id = NULL,
            channels_enabled = 0, channels_channel_id = NULL,
            roles_enabled = 0, roles_channel_id = NULL,
            invites_enabled = 0, invites_channel_id = NULL,
            server_enabled = 0, server_channel_id = NULL
          WHERE guild_id = ?
        `, [guildId], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ success: true });

    } catch (err) {
      console.error("Erreur delete logs channels:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =============================================
  // ========== ANTI-RAID CONFIG API =============
  // =============================================

  // Récupérer la config anti-raid
  router.get("/bot/get-antiraid-config", async (req, res) => {
    const { guildId } = req.query;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false, error: "Non connecté" });
    }

    const isAdmin = req.session.guilds.find(
      g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
    );

    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Permission refusée" });
    }

    try {
      let config = await db.getAsync("SELECT * FROM antiraid_config WHERE guild_id = ?", [guildId]);
      
      if (!config) {
        // Créer config par défaut
        await new Promise((resolve, reject) => {
          db.run("INSERT INTO antiraid_config (guild_id) VALUES (?)", [guildId], function(err) {
            if (err) reject(err);
            else resolve();
          });
        });
        config = await db.getAsync("SELECT * FROM antiraid_config WHERE guild_id = ?", [guildId]);
      }

      // Récupérer les salons et rôles du serveur
      const guild = client.guilds.cache.get(guildId);
      const channels = guild ? guild.channels.cache
        .filter(c => c.type === 0)
        .map(c => ({ id: c.id, name: c.name })) : [];
      const roles = guild ? guild.roles.cache
        .filter(r => r.id !== guild.id && !r.managed)
        .sort((a, b) => b.position - a.position)
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor })) : [];

      res.json({
        success: true,
        config,
        channels,
        roles
      });

    } catch (err) {
      console.error("Erreur get antiraid config:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Sauvegarder la config anti-raid
  router.post("/bot/save-antiraid-config", express.json(), async (req, res) => {
    const { guildId, config } = req.body;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false, error: "Non connecté" });
    }

    const isAdmin = req.session.guilds.find(
      g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
    );

    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Permission refusée" });
    }

    try {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO antiraid_config (
            guild_id, enabled, log_channel_id,
            antilink_enabled, antilink_action, antilink_whitelist_domains, antilink_exclude_channels, antilink_exclude_roles, antilink_warn_message,
            antiinvite_enabled, antiinvite_action, antiinvite_allow_own_server, antiinvite_exclude_channels, antiinvite_exclude_roles,
            antispam_enabled, antispam_max_messages, antispam_interval_seconds, antispam_action, antispam_mute_duration_minutes, antispam_exclude_channels, antispam_exclude_roles,
            antidupe_enabled, antidupe_max_duplicates, antidupe_interval_seconds, antidupe_action, antidupe_exclude_channels, antidupe_exclude_roles,
            antimention_enabled, antimention_max_mentions, antimention_action, antimention_exclude_channels, antimention_exclude_roles,
            antiemoji_enabled, antiemoji_max_emojis, antiemoji_action, antiemoji_exclude_channels, antiemoji_exclude_roles,
            anticaps_enabled, anticaps_max_percent, anticaps_min_length, anticaps_action, anticaps_exclude_channels, anticaps_exclude_roles,
            antinewline_enabled, antinewline_max_lines, antinewline_action, antinewline_exclude_channels, antinewline_exclude_roles,
            antibot_enabled, antibot_min_account_age_days, antibot_no_avatar_action, antibot_suspicious_name_action, antibot_action,
            antimassj_enabled, antimassj_max_joins, antimassj_interval_seconds, antimassj_action,
            antibadwords_enabled, antibadwords_action, antibadwords_words, antibadwords_exclude_channels, antibadwords_exclude_roles, antibadwords_warn_message
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(guild_id) DO UPDATE SET
            enabled = excluded.enabled,
            log_channel_id = excluded.log_channel_id,
            antilink_enabled = excluded.antilink_enabled,
            antilink_action = excluded.antilink_action,
            antilink_whitelist_domains = excluded.antilink_whitelist_domains,
            antilink_exclude_channels = excluded.antilink_exclude_channels,
            antilink_exclude_roles = excluded.antilink_exclude_roles,
            antilink_warn_message = excluded.antilink_warn_message,
            antiinvite_enabled = excluded.antiinvite_enabled,
            antiinvite_action = excluded.antiinvite_action,
            antiinvite_allow_own_server = excluded.antiinvite_allow_own_server,
            antiinvite_exclude_channels = excluded.antiinvite_exclude_channels,
            antiinvite_exclude_roles = excluded.antiinvite_exclude_roles,
            antispam_enabled = excluded.antispam_enabled,
            antispam_max_messages = excluded.antispam_max_messages,
            antispam_interval_seconds = excluded.antispam_interval_seconds,
            antispam_action = excluded.antispam_action,
            antispam_mute_duration_minutes = excluded.antispam_mute_duration_minutes,
            antispam_exclude_channels = excluded.antispam_exclude_channels,
            antispam_exclude_roles = excluded.antispam_exclude_roles,
            antidupe_enabled = excluded.antidupe_enabled,
            antidupe_max_duplicates = excluded.antidupe_max_duplicates,
            antidupe_interval_seconds = excluded.antidupe_interval_seconds,
            antidupe_action = excluded.antidupe_action,
            antidupe_exclude_channels = excluded.antidupe_exclude_channels,
            antidupe_exclude_roles = excluded.antidupe_exclude_roles,
            antimention_enabled = excluded.antimention_enabled,
            antimention_max_mentions = excluded.antimention_max_mentions,
            antimention_action = excluded.antimention_action,
            antimention_exclude_channels = excluded.antimention_exclude_channels,
            antimention_exclude_roles = excluded.antimention_exclude_roles,
            antiemoji_enabled = excluded.antiemoji_enabled,
            antiemoji_max_emojis = excluded.antiemoji_max_emojis,
            antiemoji_action = excluded.antiemoji_action,
            antiemoji_exclude_channels = excluded.antiemoji_exclude_channels,
            antiemoji_exclude_roles = excluded.antiemoji_exclude_roles,
            anticaps_enabled = excluded.anticaps_enabled,
            anticaps_max_percent = excluded.anticaps_max_percent,
            anticaps_min_length = excluded.anticaps_min_length,
            anticaps_action = excluded.anticaps_action,
            anticaps_exclude_channels = excluded.anticaps_exclude_channels,
            anticaps_exclude_roles = excluded.anticaps_exclude_roles,
            antinewline_enabled = excluded.antinewline_enabled,
            antinewline_max_lines = excluded.antinewline_max_lines,
            antinewline_action = excluded.antinewline_action,
            antinewline_exclude_channels = excluded.antinewline_exclude_channels,
            antinewline_exclude_roles = excluded.antinewline_exclude_roles,
            antibot_enabled = excluded.antibot_enabled,
            antibot_min_account_age_days = excluded.antibot_min_account_age_days,
            antibot_no_avatar_action = excluded.antibot_no_avatar_action,
            antibot_suspicious_name_action = excluded.antibot_suspicious_name_action,
            antibot_action = excluded.antibot_action,
            antimassj_enabled = excluded.antimassj_enabled,
            antimassj_max_joins = excluded.antimassj_max_joins,
            antimassj_interval_seconds = excluded.antimassj_interval_seconds,
            antimassj_action = excluded.antimassj_action,
            antibadwords_enabled = excluded.antibadwords_enabled,
            antibadwords_action = excluded.antibadwords_action,
            antibadwords_words = excluded.antibadwords_words,
            antibadwords_exclude_channels = excluded.antibadwords_exclude_channels,
            antibadwords_exclude_roles = excluded.antibadwords_exclude_roles,
            antibadwords_warn_message = excluded.antibadwords_warn_message
        `, [
          guildId,
          config.enabled ? 1 : 0,
          config.log_channel_id || null,
          // Anti-Link
          config.antilink_enabled ? 1 : 0,
          config.antilink_action || 'delete',
          JSON.stringify(config.antilink_whitelist_domains || []),
          JSON.stringify(config.antilink_exclude_channels || []),
          JSON.stringify(config.antilink_exclude_roles || []),
          config.antilink_warn_message || '⚠️ Les liens ne sont pas autorisés ici.',
          // Anti-Invite
          config.antiinvite_enabled ? 1 : 0,
          config.antiinvite_action || 'delete',
          config.antiinvite_allow_own_server ? 1 : 0,
          JSON.stringify(config.antiinvite_exclude_channels || []),
          JSON.stringify(config.antiinvite_exclude_roles || []),
          // Anti-Spam
          config.antispam_enabled ? 1 : 0,
          config.antispam_max_messages || 5,
          config.antispam_interval_seconds || 5,
          config.antispam_action || 'mute',
          config.antispam_mute_duration_minutes || 10,
          JSON.stringify(config.antispam_exclude_channels || []),
          JSON.stringify(config.antispam_exclude_roles || []),
          // Anti-Duplicate
          config.antidupe_enabled ? 1 : 0,
          config.antidupe_max_duplicates || 3,
          config.antidupe_interval_seconds || 30,
          config.antidupe_action || 'delete',
          JSON.stringify(config.antidupe_exclude_channels || []),
          JSON.stringify(config.antidupe_exclude_roles || []),
          // Anti-Mention
          config.antimention_enabled ? 1 : 0,
          config.antimention_max_mentions || 5,
          config.antimention_action || 'delete',
          JSON.stringify(config.antimention_exclude_channels || []),
          JSON.stringify(config.antimention_exclude_roles || []),
          // Anti-Emoji
          config.antiemoji_enabled ? 1 : 0,
          config.antiemoji_max_emojis || 10,
          config.antiemoji_action || 'delete',
          JSON.stringify(config.antiemoji_exclude_channels || []),
          JSON.stringify(config.antiemoji_exclude_roles || []),
          // Anti-Caps
          config.anticaps_enabled ? 1 : 0,
          config.anticaps_max_percent || 70,
          config.anticaps_min_length || 10,
          config.anticaps_action || 'delete',
          JSON.stringify(config.anticaps_exclude_channels || []),
          JSON.stringify(config.anticaps_exclude_roles || []),
          // Anti-Newline
          config.antinewline_enabled ? 1 : 0,
          config.antinewline_max_lines || 15,
          config.antinewline_action || 'delete',
          JSON.stringify(config.antinewline_exclude_channels || []),
          JSON.stringify(config.antinewline_exclude_roles || []),
          // Anti-Bot
          config.antibot_enabled ? 1 : 0,
          config.antibot_min_account_age_days || 7,
          config.antibot_no_avatar_action ? 1 : 0,
          config.antibot_suspicious_name_action ? 1 : 0,
          config.antibot_action || 'kick',
          // Anti-Mass Join
          config.antimassj_enabled ? 1 : 0,
          config.antimassj_max_joins || 10,
          config.antimassj_interval_seconds || 10,
          config.antimassj_action || 'kick',
          // Anti-Badwords
          config.antibadwords_enabled ? 1 : 0,
          config.antibadwords_action || 'delete',
          JSON.stringify(config.antibadwords_words || []),
          JSON.stringify(config.antibadwords_exclude_channels || []),
          JSON.stringify(config.antibadwords_exclude_roles || []),
          config.antibadwords_warn_message || '⚠️ Les insultes et gros mots ne sont pas autorisés.'
        ], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ success: true });

    } catch (err) {
      console.error("Erreur save antiraid config:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =============================================
  // ========== WARNINGS CONFIG API ==============
  // =============================================

  // Récupérer la config des warnings
  router.get("/bot/get-warnings-config", async (req, res) => {
    const { guildId } = req.query;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false, error: "Non connecté" });
    }

    const isAdmin = req.session.guilds.find(
      g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
    );

    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Permission refusée" });
    }

    try {
      let config = await db.getAsync("SELECT * FROM warnings_config WHERE guild_id = ?", [guildId]);
      
      if (!config) {
        // Créer config par défaut
        await new Promise((resolve, reject) => {
          db.run("INSERT INTO warnings_config (guild_id) VALUES (?)", [guildId], function(err) {
            if (err) reject(err);
            else resolve();
          });
        });
        config = await db.getAsync("SELECT * FROM warnings_config WHERE guild_id = ?", [guildId]);
      }

      // Récupérer les salons du serveur
      const guild = client.guilds.cache.get(guildId);
      const channels = guild ? guild.channels.cache
        .filter(c => c.type === 0)
        .map(c => ({ id: c.id, name: c.name })) : [];

      res.json({
        success: true,
        config,
        channels
      });

    } catch (err) {
      console.error("Erreur get warnings config:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Sauvegarder la config des warnings
  router.post("/bot/save-warnings-config", express.json(), async (req, res) => {
    const { guildId, config } = req.body;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false, error: "Non connecté" });
    }

    const isAdmin = req.session.guilds.find(
      g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
    );

    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Permission refusée" });
    }

    try {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO warnings_config (
            guild_id, enabled,
            warn1_action, warn1_duration,
            warn2_action, warn2_duration,
            warn3_action, warn3_duration,
            warn4_action, warn4_duration,
            warn5_action, warn5_duration,
            decay_enabled, decay_days,
            notify_user, notify_channel_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(guild_id) DO UPDATE SET
            enabled = excluded.enabled,
            warn1_action = excluded.warn1_action,
            warn1_duration = excluded.warn1_duration,
            warn2_action = excluded.warn2_action,
            warn2_duration = excluded.warn2_duration,
            warn3_action = excluded.warn3_action,
            warn3_duration = excluded.warn3_duration,
            warn4_action = excluded.warn4_action,
            warn4_duration = excluded.warn4_duration,
            warn5_action = excluded.warn5_action,
            warn5_duration = excluded.warn5_duration,
            decay_enabled = excluded.decay_enabled,
            decay_days = excluded.decay_days,
            notify_user = excluded.notify_user,
            notify_channel_id = excluded.notify_channel_id
        `, [
          guildId,
          config.enabled ? 1 : 0,
          config.warn1_action || 'none',
          config.warn1_duration || 10,
          config.warn2_action || 'none',
          config.warn2_duration || 30,
          config.warn3_action || 'mute',
          config.warn3_duration || 60,
          config.warn4_action || 'kick',
          config.warn4_duration || 0,
          config.warn5_action || 'ban',
          config.warn5_duration || 0,
          config.decay_enabled ? 1 : 0,
          config.decay_days || 30,
          config.notify_user ? 1 : 0,
          config.notify_channel_id || null
        ], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ success: true });

    } catch (err) {
      console.error("Erreur save warnings config:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Récupérer les warnings d'un serveur
  router.get("/bot/get-warnings-list", async (req, res) => {
    const { guildId, userId } = req.query;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false, error: "Non connecté" });
    }

    const isAdmin = req.session.guilds.find(
      g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
    );

    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Permission refusée" });
    }

    try {
      let warnings;
      if (userId) {
        warnings = await db.allAsync(
          "SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 50",
          [guildId, userId]
        );
      } else {
        warnings = await db.allAsync(
          "SELECT * FROM warnings WHERE guild_id = ? ORDER BY created_at DESC LIMIT 100",
          [guildId]
        );
      }

      res.json({ success: true, warnings: warnings || [] });

    } catch (err) {
      console.error("Erreur get warnings list:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Supprimer un warning
  router.post("/bot/delete-warning", express.json(), async (req, res) => {
    const { guildId, warnId } = req.body;

    if (!req.session.guilds) {
      return res.status(401).json({ success: false, error: "Non connecté" });
    }

    const isAdmin = req.session.guilds.find(
      g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
    );

    if (!isAdmin) {
      return res.status(403).json({ success: false, error: "Permission refusée" });
    }

    try {
      await new Promise((resolve, reject) => {
        db.run("DELETE FROM warnings WHERE id = ? AND guild_id = ?", [warnId, guildId], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ success: true });

    } catch (err) {
      console.error("Erreur delete warning:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.use("/api", router);
};
