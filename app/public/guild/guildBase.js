window.guildId = window.location.pathname.split("/")[2];

// Charger les infos du bot
fetch("/api/bot-info")
  .then(res => res.json())
  .then(bot => {
    const botAvatar = document.getElementById("bot-avatar");
    if (botAvatar) {
      botAvatar.src = `https://cdn.discordapp.com/avatars/${bot.id}/${bot.avatar}.png`;
    }
  })
  .catch(() => {});

// Charger les infos utilisateur
fetch("/api/user")
  .then(res => {
    if (!res.ok) throw new Error("Non connecté");
    return res.json();
  })
  .then(user => {
    const avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
    const userAvatar = document.getElementById("user-avatar");
    const userName = document.getElementById("user-name");
    
    if (userAvatar) userAvatar.src = avatarUrl;
    if (userName) userName.textContent = user.username;
  })
  .catch(() => {
    window.location.href = "/auth/login";
  });

// Nom et icône du serveur
fetch("/api/guilds")
  .then(res => res.json())
  .then(guilds => {
    const guild = guilds.find(g => g.id === guildId);
    const guildName = document.getElementById("guild-name");
    const guildIcon = document.getElementById("guild-icon");
    const guildIdEl = document.getElementById("guild-id");
    const breadcrumbGuild = document.getElementById("breadcrumb-guild");
    
    if (guild) {
      if (guildName) guildName.textContent = guild.name;
      if (breadcrumbGuild) breadcrumbGuild.textContent = guild.name;
      if (guildIdEl) guildIdEl.textContent = `ID: ${guild.id}`;
      if (guildIcon && guild.icon) {
        guildIcon.src = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
      }
      document.title = `${guild.name} - LazyBot`;
    } else {
      if (guildName) guildName.textContent = "Serveur introuvable";
    }
  });

// Channels texte
fetch(`/api/bot/get-text-channels/${guildId}`)
  .then(res => res.json())
  .then(channels => {
    const welcome = document.getElementById("welcome-channel");
    const goodbye = document.getElementById("goodbye-channel");
    const levelAnnouncements = document.getElementById("level-announcements-channel");
    const levelChannelRestrict = document.getElementById("level-channel-with-or-without-xp");

    channels.forEach(c => {
      const opt = new Option(`#${c.name}`, c.id);
      welcome?.appendChild(opt);
      goodbye?.appendChild(opt.cloneNode(true));
      levelAnnouncements?.appendChild(opt.cloneNode(true));
      levelChannelRestrict?.appendChild(opt.cloneNode(true));
    });
  });

// Channels vocaux
fetch(`/api/bot/get-voice-channels/${guildId}`)
  .then(res => res.json())
  .then(channels => {
    const vocalExclude = document.getElementById("autorole-vocal-exclude-channel");

    channels.forEach(c => {
      const opt = new Option(`🔊 ${c.name}`, c.id);
      vocalExclude?.appendChild(opt);
    });
  });

// Rôles
fetch(`/api/bot/get-roles/${guildId}`)
  .then(res => res.json())
  .then(roles => {
    const newUser = document.getElementById("autorole-role");
    const vocal = document.getElementById("autorole-vocal-role");
    const levelRoleRestrict = document.getElementById("level-role-with-or-without-xp");

    roles.forEach(r => {
      const opt = new Option(r.name, r.id);
      newUser?.appendChild(opt);
      vocal?.appendChild(opt.cloneNode(true));
      levelRoleRestrict?.appendChild(opt.cloneNode(true));
    });
  });
