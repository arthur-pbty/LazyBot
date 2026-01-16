const autoroleVocalForm = document.getElementById("autorole-vocal-form");
const autoroleVocalEnabled = document.getElementById("autorole-vocal-enabled");
const autoroleVocalRole = document.getElementById("autorole-vocal-role");
const excludeSelect = document.getElementById("autorole-vocal-exclude-channel");
const statusAutoroleVocalForm = document.getElementById("status-autorole-vocal-form");

fetch(`/api/bot/get-voice-channels/${guildId}`)
  .then(res => res.json())
  .then(channels => {
    channels.forEach(c => {
      excludeSelect.appendChild(new Option(`#${c.name}`, c.id));
    });
    return fetch(`/api/bot/get-autorole-vocal-config/${guildId}`);
  })
  .then(res => res.json())
  .then(cfg => {
    autoroleVocalEnabled.checked = cfg.enabled;
    autoroleVocalRole.value = cfg.roleId;
    Array.from(excludeSelect.options).forEach(opt => {
      opt.selected = cfg.excludeChannelIds?.includes(opt.value);
    });
  });

autoroleVocalForm.addEventListener("submit", async e => {
  e.preventDefault();

  const exclude = Array.from(excludeSelect.selectedOptions).map(o => o.value);

  const res = await fetch("/api/bot/save-autorole-vocal-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      guildId,
      enabled: autoroleVocalEnabled.checked,
      roleId: autoroleVocalRole.value,
      excludeChannelId: exclude
    })
  });

  statusAutoroleVocalForm.textContent = (await res.json()).success
    ? "Auto-rôle vocal sauvegardé ✅"
    : "Erreur ❌";
});
