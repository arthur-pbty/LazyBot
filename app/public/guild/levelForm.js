const levelForm = document.getElementById("level-form");
const levelEnabled = document.getElementById("level-enabled");
const levelAnnouncementsEnabled = document.getElementById("level-announcement-enabled");
const levelAnnouncementsChannel = document.getElementById("level-announcements-channel");
const levelAnnouncementsMessage = document.getElementById("level-announcements-message");
const xpCourbeType = document.getElementById("level-xp-curve-type");
const multiplierCourbeForLevel = document.getElementById("level-xp-multiplier");
const levelAnnouncementEveryLevel = document.getElementById("level-announcement-every");
const levelMax = document.getElementById("level-max-level");
const roleWithWithoutType = document.getElementById("level-role-with-or-without-xp-type");
const roleWithWithoutXp = document.getElementById("level-role-with-or-without-xp");
const salonWithWithoutType = document.getElementById("level-channel-with-or-without-xp-type");
const salonWithWithoutXp = document.getElementById("level-channel-with-or-without-xp");
const gainXpOnMessage = document.getElementById("message-xp-enabled");
const gainXpMessageLowerBound = document.getElementById("level-xp-per-message-min");
const gainXpMessageUpperBound = document.getElementById("level-xp-per-message-max");
const cooldownXpMessageSeconds = document.getElementById("level-xp-cooldown");
const gainXpOnVoice = document.getElementById("voice-xp-enabled");
const gainVoiceXpLowerBound = document.getElementById("level-xp-per-voice-min");
const gainVoiceXpUpperBound = document.getElementById("level-xp-per-voice-max");
const statusLevelForm = document.getElementById("status-level-form");

// 1️⃣ RÔLES
fetch(`/api/bot/get-roles/${guildId}`)
  .then(res => res.json())
  .then(roles => {
    roles.forEach(r => {
      roleWithWithoutXp?.appendChild(new Option(r.name, r.id));
    });

    // 2️⃣ SALONS TEXTE
    return fetch(`/api/bot/get-text-channels/${guildId}`);
  })
  .then(res => res.json())
  .then(textSalons => {
    textSalons.forEach(c => {
      salonWithWithoutXp?.appendChild(new Option(`#${c.name}`, c.id));
    });

    // 3️⃣ SALONS VOCAUX
    return fetch(`/api/bot/get-voice-channels/${guildId}`);
  })
  .then(res => res.json())
  .then(voiceSalons => {
    voiceSalons.forEach(c => {
      salonWithWithoutXp?.appendChild(new Option(`🔊 ${c.name}`, c.id));
    });

    // 4️⃣ CONFIG (APRÈS QUE TOUT EST CHARGÉ)
    return fetch(`/api/bot/get-level-config/${guildId}`);
  })
  .then(res => res.json())
  .then(cfg => {
    levelEnabled.checked = cfg.enabled;
    levelAnnouncementsEnabled.checked = cfg.levelAnnouncementsEnabled;
    levelAnnouncementsChannel.value = cfg.levelAnnouncementsChannelId;
    levelAnnouncementsMessage.value = cfg.levelAnnouncementsMessage;

    xpCourbeType.value = cfg.xpCourbeType;
    multiplierCourbeForLevel.value = cfg.multiplierCourbeForLevel;
    levelAnnouncementEveryLevel.value = cfg.levelAnnouncementEveryLevel;
    levelMax.value = cfg.levelMax;

    roleWithWithoutType.value = cfg.roleWithWithoutType;
    Array.from(roleWithWithoutXp.options).forEach(opt => {
      opt.selected = cfg.roleWithWithoutXp?.includes(opt.value);
    });

    salonWithWithoutType.value = cfg.salonWithWithoutType;
    Array.from(salonWithWithoutXp.options).forEach(opt => {
      opt.selected = cfg.salonWithWithoutXp?.includes(opt.value);
    });

    gainXpOnMessage.checked = cfg.gainXpOnMessage;
    gainXpMessageLowerBound.value = cfg.gainXpMessageLowerBound;
    gainXpMessageUpperBound.value = cfg.gainXpMessageUpperBound;
    cooldownXpMessageSeconds.value = cfg.cooldownXpMessageSeconds;

    gainXpOnVoice.checked = cfg.gainXpOnVoice;
    gainVoiceXpLowerBound.value = cfg.gainVoiceXpLowerBound;
    gainVoiceXpUpperBound.value = cfg.gainVoiceXpUpperBound;
  })
  .catch(console.error);


levelForm.addEventListener("submit", async e => {
  e.preventDefault();

  const res = await fetch("/api/bot/save-level-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      guildId,
      levelEnabled: levelEnabled.checked,
      levelAnnouncementsEnabled: levelAnnouncementsEnabled.checked,
      levelAnnouncementsChannelId: levelAnnouncementsChannel.value,
      levelAnnouncementsMessage: levelAnnouncementsMessage.value,
      xpCourbeType: xpCourbeType.value,
      multiplierCourbeForLevel: parseInt(multiplierCourbeForLevel.value, 10),
      levelAnnouncementEveryLevel: parseInt(levelAnnouncementEveryLevel.value, 10),
      levelMax: parseInt(levelMax.value, 10),
      roleWithWithoutType: roleWithWithoutType.value,
      roleWithWithoutXp: Array.from(roleWithWithoutXp.selectedOptions).map(opt => opt.value),
      salonWithWithoutType: salonWithWithoutType.value,
      salonWithWithoutXp: Array.from(salonWithWithoutXp.selectedOptions).map(opt => opt.value),
      gainXpOnMessage: gainXpOnMessage.checked,
      gainXpMessageLowerBound: parseInt(gainXpMessageLowerBound.value, 10),
      gainXpMessageUpperBound: parseInt(gainXpMessageUpperBound.value, 10),
      cooldownXpMessageSeconds: parseInt(cooldownXpMessageSeconds.value, 10),
      gainXpOnVoice: gainXpOnVoice.checked,
      gainVoiceXpLowerBound: parseInt(gainVoiceXpLowerBound.value, 10),
      gainVoiceXpUpperBound: parseInt(gainVoiceXpUpperBound.value, 10)
    })
  });

  statusLevelForm.textContent = (await res.json()).success
    ? "Config niveaux sauvegardée ✅"
    : "Erreur ❌";
});