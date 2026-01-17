const autoroleVocalEnabled = document.getElementById("autorole-vocal-enabled");
const autoroleVocalRole = document.getElementById("autorole-vocal-role");
const excludeSelect = document.getElementById("autorole-vocal-exclude-channel");
const saveAutoroleVocal = document.getElementById("save-autorole-vocal");

// Charger la config après que les channels soient chargés
setTimeout(() => {
  fetch(`/api/bot/get-autorole-vocal-config/${guildId}`)
    .then(res => res.json())
    .then(cfg => {
      autoroleVocalEnabled.checked = cfg.enabled;
      autoroleVocalRole.value = cfg.roleId;
      Array.from(excludeSelect.options).forEach(opt => {
        opt.selected = cfg.excludeChannelIds?.includes(opt.value);
      });
    });
}, 500);

// Sauvegarder
saveAutoroleVocal.addEventListener("click", async () => {
  saveAutoroleVocal.disabled = true;
  saveAutoroleVocal.textContent = "Sauvegarde...";

  try {
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

    const data = await res.json();
    if (data.success) {
      showStatus("status-autorole-vocal-form", "Configuration sauvegardée ✅", "success");
    } else {
      showStatus("status-autorole-vocal-form", "Erreur lors de la sauvegarde ❌", "error");
    }
  } catch (error) {
    showStatus("status-autorole-vocal-form", "Erreur de connexion ❌", "error");
  }

  saveAutoroleVocal.disabled = false;
  saveAutoroleVocal.textContent = "Sauvegarder";
});
