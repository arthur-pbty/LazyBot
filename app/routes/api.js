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

  app.use("/api", router);
};
