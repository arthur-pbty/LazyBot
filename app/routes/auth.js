const express = require("express");
const fetch = require("cross-fetch");
const router = express.Router();
const path = require("path");

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

module.exports = (app, db, client) => {
  // --- Connexion Discord ---
  router.get("/discord", (req, res) => {
    const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
    res.redirect(url);
  });

  router.get("/discord/callback", async (req, res) => {
    const code = req.query.code;
    if (!code) return res.send("Pas de code OAuth reçu !");

    try {
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

      const userResponse = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const user = await userResponse.json();

      const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const guilds = await guildsResponse.json();

      req.session.user = user;
      req.session.guilds = guilds;

      res.redirect("/dashboard");
    } catch (err) {
      console.error(err);
      res.send("Erreur lors de la connexion Discord !");
    }
  });

  router.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
  });

  app.use("/auth", router);
};
