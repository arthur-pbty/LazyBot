const loadSlashCommands = require('./slash_commands.js');
loadSlashCommands();

const { Client, GatewayIntentBits, ActivityType, Events } = require("discord.js");

const client = new Client({ intents: Object.values(GatewayIntentBits) });

client.once("clientReady", () => {
  console.log(`Bot connecté en tant que ${client.user.tag}`);
  client.user.setActivity("LazyBot à votre service !", { type: ActivityType.Custom });
});


client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
});


client.on(Events.MessageCreate, message => {
  if (message.author.bot) return;
  const config = global.guildConfigs?.[message.guild.id];
  if (config?.autoMessage) {
    message.channel.send(config.autoMessage);
  }
});


client.login(process.env.BOT_TOKEN);

module.exports = client;
