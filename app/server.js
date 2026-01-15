require("dotenv").config(); // charge les variables depuis .env

const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
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
  store: new SQLiteStore({ db: "sessions.sqlite", dir: "./" }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7*24*60*60*1000 } // 7 jours
}));

// --- Servir le dossier public ---
app.use(express.static(path.join(__dirname, "public")));

// --- Routes ---
require("./routes/auth")(app, db, client);
require("./routes/api")(app, db, client);

app.get("/invite-bot", (req, res) => {
  const permissions = 8; // Permissions administrateur

  const scopes = [
    "bot",
    "applications.commands",
    "identify",
    "guilds"
  ].join(" ");

  const url =
    "https://discord.com/oauth2/authorize" +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    "&response_type=code" +
    `&scope=${encodeURIComponent(scopes)}` +
    `&permissions=${permissions}`;

  // Tu peux juste renvoyer le lien
  res.json({ url });
});

// Servir le dashboard par serveur
app.get("/guild/:guildId", (req, res) => {
  const guildId = req.params.guildId;
  const userGuilds = req.session.guilds;

  // Vérifie que l'utilisateur est connecté et a admin sur ce serveur
  if (!userGuilds) return res.redirect("/auth/discord"); // ou une page de connexion
  const guildValid = userGuilds.find(
    g => g.id === guildId && (BigInt(g.permissions) & 0x8n) === 0x8n
  );
  if (!guildValid) return res.send("Accès interdit : vous n'êtes pas admin sur ce serveur.");

  // Redirige vers la page HTML statique du dashboard
  res.sendFile(path.join(__dirname, "public", "guild.html"));
});

app.get("/dashboard", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/auth/discord");
  }

  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});


// --- Lancement du serveur ---
app.listen(PORT, () => console.log(`Serveur lancé sur http://localhost:${PORT}`));