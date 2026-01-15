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
  db.get(
    "SELECT enabled, role_id FROM autorole_newuser_config WHERE guild_id = ?",
    [member.guild.id],
    (err, row) => {
      if (err || !row || !row.enabled) return;

      const role = member.guild.roles.cache.get(row.role_id);
      if (role) {
        member.roles.add(role);
      }
    }
  );
});


client.on(Events.GuildMemberRemove, member => {
  db.get(
    "SELECT enabled, channel_id, message FROM goodbye_config WHERE guild_id = ?",
    [member.guild.id],
    (err, row) => {
      if (err || !row || !row.enabled) return;

      let msg = row.message;

      msg = msg
        .replace("{user}", member.user.username)
        .replace("{server}", member.guild.name);

      const channel = member.guild.channels.cache.get(row.channel_id);
      if (channel) {
        channel.send(msg);
      }
    }
  );
});


client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  if (newState.member.user.bot) return;

  const guildId = newState.guild.id;

  db.get(
    "SELECT enabled, role_id, exclude_channel_ids FROM autorole_vocal_config WHERE guild_id = ?",
    [guildId],
    (err, row) => {
      if (err || !row || !row.enabled) return;

      let excludeChannelIds = [];
      try {
        excludeChannelIds = row.exclude_channel_ids
          ? JSON.parse(row.exclude_channel_ids)
          : [];
      } catch (err) {
        console.error("Erreur parsing exclude_channel_ids", err);
        excludeChannelIds = [];
      }
      
      const role = newState.guild.roles.cache.get(row.role_id);
      if (!role) return;

      // User joins a voice channel and it's not excluded et a pas déjà le rôle
      if (newState.channelId && !excludeChannelIds.includes(newState.channelId) && !newState.member.roles.cache.has(role.id)) {
        newState.member.roles.add(role);
      }
      // User leaves a voice channel or joins an excluded one
      else if (!newState.channelId || excludeChannelIds.includes(newState.channelId)) {
        newState.member.roles.remove(role);
      }
    }
  );
});

client.login(process.env.BOT_TOKEN);

module.exports = client;
