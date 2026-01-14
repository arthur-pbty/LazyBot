require("dotenv").config(); // charge les variables depuis .env

const express = require("express");
const session = require("express-session");
const fetch = require("cross-fetch"); // fetch compatible Node
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// --- Session setup ---
app.use(session({
  secret: "un_secret_long_et_complexe", // change-le en production
  resave: false,
  saveUninitialized: true,
}));

// --- Servir le dossier public ---
app.use(express.static(path.join(__dirname, "public")));

// --- Route pour démarrer la connexion Discord ---
app.get("/auth/discord", (req, res) => {
  const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`;
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

    // Stocker l'utilisateur dans la session
    req.session.user = user;

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

// --- Lancement du serveur ---
app.listen(PORT, () => console.log(`Serveur lancé sur http://localhost:${PORT}`));
