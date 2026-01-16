window.guildId = window.location.pathname.split("/")[2];

// Nom du serveur
fetch("/api/guilds")
  .then(res => res.json())
  .then(guilds => {
    const guild = guilds.find(g => g.id === guildId);
    document.getElementById("guild-name").textContent =
      guild ? `Dashboard : ${guild.name}` : "Serveur introuvable";
  });

// Channels texte
fetch(`/api/bot/get-text-channels/${guildId}`)
  .then(res => res.json())
  .then(channels => {
    const welcome = document.getElementById("welcome-channel");
    const goodbye = document.getElementById("goodbye-channel");
    const levelAnnouncements = document.getElementById("level-announcements-channel");

    channels.forEach(c => {
      const opt = new Option(`#${c.name}`, c.id);
      welcome?.appendChild(opt);
      goodbye?.appendChild(opt.cloneNode(true));
      levelAnnouncements?.appendChild(opt.cloneNode(true));
    });
  });

// Rôles
fetch(`/api/bot/get-roles/${guildId}`)
  .then(res => res.json())
  .then(roles => {
    const newUser = document.getElementById("autorole-role");
    const vocal = document.getElementById("autorole-vocal-role");

    roles.forEach(r => {
      const opt = new Option(r.name, r.id);
      newUser?.appendChild(opt);
      vocal?.appendChild(opt.cloneNode(true));
    });
  });
