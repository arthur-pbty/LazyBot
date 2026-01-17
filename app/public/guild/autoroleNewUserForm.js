const autoroleEnabled = document.getElementById("autorole-enabled");
const autoroleRole = document.getElementById("autorole-role");
const saveAutorole = document.getElementById("save-autorole");

// Charger la config
fetch(`/api/bot/get-autorole-newuser-config/${guildId}`)
  .then(res => res.json())
  .then(cfg => {
    autoroleEnabled.checked = cfg.enabled;
    autoroleRole.value = cfg.roleId;
  });

// Sauvegarder
saveAutorole.addEventListener("click", async () => {
  saveAutorole.disabled = true;
  saveAutorole.textContent = "Sauvegarde...";

  try {
    const res = await fetch("/api/bot/save-autorole-newuser-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guildId,
        enabled: autoroleEnabled.checked,
        roleId: autoroleRole.value
      })
    });

    const data = await res.json();
    if (data.success) {
      showStatus("status-autorole-form", "Configuration sauvegardée ✅", "success");
    } else {
      showStatus("status-autorole-form", "Erreur lors de la sauvegarde ❌", "error");
    }
  } catch (error) {
    showStatus("status-autorole-form", "Erreur de connexion ❌", "error");
  }

  saveAutorole.disabled = false;
  saveAutorole.textContent = "Sauvegarder";
});
