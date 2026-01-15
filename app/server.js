require("dotenv").config(); // charge les variables depuis .env

const express = require("express");
const session = require("express-session");
const fetch = require("cross-fetch"); // fetch compatible Node
const path = require("path");

// importer la DB
const db = require("./db");

// importer le bot
const client = require("./bot"); 

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// --- Session setup ---
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

// --- Servir le dossier public ---
app.use(express.static(path.join(__dirname, "public")));

// --- Route pour démarrer la connexion Discord ---
app.get("/auth/discord", (req, res) => {
  const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
  res.redirect(url);
});

// --- Callback après connexion Discord ---
app.get("/auth/discord/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("Pas de code OAuth reçu !");

  try {
    // Échange du code contre access token
    const data = new URLSearchParams();
    data.append("client_id", CLIENT_ID);
    data.append("client_secret", CLIENT_SECRET);
    data.append("grant_type", "authorization_code");
    data.append("code", code);
    data.append("redirect_uri", REDIRECT_URI);
    data.append("scope", "identify");

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: data,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const tokenJson = await tokenResponse.json();
    const accessToken = tokenJson.access_token;

    // Récupération des infos utilisateur
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const user = await userResponse.json();

    // Récupérer la liste des guilds
    const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const guilds = await guildsResponse.json();

    // Stocker l'utilisateur dans la session
    req.session.user = user;
    req.session.guilds = guilds;

    // Rediriger vers la page HTML
    res.redirect("/welcome.html");
  } catch (err) {
    console.error(err);
    res.send("Erreur lors de la connexion Discord !");
  }
});

// --- API pour récupérer l'objet user côté front ---
app.get("/api/user", (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: "Utilisateur non connecté" });
  }
});

app.get("/api/guilds", (req, res) => {
  const userGuilds = req.session.guilds; // toutes les guilds de l'utilisateur
  if (!userGuilds) return res.status(401).json({ error: "Utilisateur non connecté" });

  // Liste des guilds où le bot est présent
  const botGuildIds = client.guilds.cache.map(g => g.id);

  // Filtrer : bot présent + admin
  const validGuilds = userGuilds.filter(g => {
    const hasAdmin = (g.permissions & 0x8) === 0x8; // flag admin
    const botHere = botGuildIds.includes(g.id);
    return hasAdmin && botHere;
  });

  app.get("/invite-bot", (req, res) => {
    const clientId = process.env.CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.REDIRECT_URI);
    const permissions = 8; // Permissions administrateur
    const scope = encodeURIComponent("bot guilds applications.commands");

    const url = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scope}&redirect_uri=${redirectUri}&response_type=code`;

    // Tu peux juste renvoyer le lien
    res.json({ url });
  });

  // Servir le dashboard par serveur
  app.get("/guild/:guildId", (req, res) => {
    const guildId = req.params.guildId;
    const userGuilds = req.session.guilds;

    // Vérifie que l'utilisateur est connecté et a admin sur ce serveur
    if (!userGuilds) return res.redirect("/"); // ou une page de connexion
    const guildValid = userGuilds.find(
      g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
    );
    if (!guildValid) return res.send("Accès interdit : vous n'êtes pas admin sur ce serveur.");

    // Redirige vers la page HTML statique du dashboard
    res.sendFile(path.join(__dirname, "public", "guild.html"));
  });

  // API pour sauvegarder la configuration de bienvenue
  app.post("/api/bot/save-welcome-config", express.json(), (req, res) => {
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

  app.get("/api/bot/get-welcome-config/:guildId", (req, res) => {
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

  app.get("/api/bot/get-text-channels/:guildId", (req, res) => {
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

  res.json(validGuilds);
});


// --- Lancement du serveur ---
app.listen(PORT, () => console.log(`Serveur lancé sur http://localhost:${PORT}`));
