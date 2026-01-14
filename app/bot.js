const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", () => {
  console.log(`Bot connecté en tant que ${client.user.tag}`);
});

client.login(process.env.BOT_TOKEN);

module.exports = client;
