const loadSlashCommands = require('./slash_commands.js');
loadSlashCommands();

const db = require("./db");

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


client.on(Events.GuildMemberAdd, member => {
  db.get(
    "SELECT enabled, channel_id, message FROM welcome_config WHERE guild_id = ?",
    [member.guild.id],
    (err, row) => {
      if (err || !row || !row.enabled) return;

      let msg = row.message;

      msg = msg
        .replace("{user}", member.user.username)
        .replace("{mention}", `<@${member.id}>`)
        .replace("{server}", member.guild.name);

      const channel = member.guild.channels.cache.get(row.channel_id);
      if (channel) {
        channel.send(msg);
      }
    }
  );
});


client.login(process.env.BOT_TOKEN);

module.exports = client;
