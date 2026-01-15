const express = require("express");
const router = express.Router();

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

  app.use("/api", router);
};
