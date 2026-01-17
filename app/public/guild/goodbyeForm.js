const goodbyeEnabled = document.getElementById("goodbye-enabled");
const goodbyeChannel = document.getElementById("goodbye-channel");
const goodbyeMessage = document.getElementById("goodbye-message");
const saveGoodbye = document.getElementById("save-goodbye");

// Message par défaut
const defaultGoodbyeMessage = "Au revoir **{user}**, on espère te revoir sur **{server}** ! 👋";

// Charger la config
fetch(`/api/bot/get-goodbye-config/${guildId}`)
  .then(res => res.json())
  .then(cfg => {
    goodbyeEnabled.checked = cfg.enabled;
    goodbyeChannel.value = cfg.channelId;
    goodbyeMessage.value = cfg.message || defaultGoodbyeMessage;
  });

// Sauvegarder
saveGoodbye.addEventListener("click", async () => {
  saveGoodbye.disabled = true;
  saveGoodbye.textContent = "Sauvegarde...";

  try {
    const res = await fetch("/api/bot/save-goodbye-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guildId,
        goodbyeEnabled: goodbyeEnabled.checked,
        channelId: goodbyeChannel.value,
        goodbyeMessage: goodbyeMessage.value
      })
    });

    const data = await res.json();
    if (data.success) {
      showStatus("status-goodbye-form", "Configuration sauvegardée ✅", "success");
    } else {
      showStatus("status-goodbye-form", "Erreur lors de la sauvegarde ❌", "error");
    }
  } catch (error) {
    showStatus("status-goodbye-form", "Erreur de connexion ❌", "error");
  }

  saveGoodbye.disabled = false;
  saveGoodbye.textContent = "Sauvegarder";
});
