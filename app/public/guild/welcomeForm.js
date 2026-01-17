const welcomeEnabled = document.getElementById("welcome-enabled");
const welcomeChannel = document.getElementById("welcome-channel");
const welcomeMessage = document.getElementById("welcome-message");
const saveWelcome = document.getElementById("save-welcome");

// Message par défaut
const defaultWelcomeMessage = "Bienvenue {mention} sur **{server}** ! 🎉";

// Charger la config
fetch(`/api/bot/get-welcome-config/${guildId}`)
  .then(res => res.json())
  .then(cfg => {
    welcomeEnabled.checked = cfg.enabled;
    welcomeChannel.value = cfg.channelId;
    welcomeMessage.value = cfg.message || defaultWelcomeMessage;
  });

// Sauvegarder
saveWelcome.addEventListener("click", async () => {
  saveWelcome.disabled = true;
  saveWelcome.textContent = "Sauvegarde...";

  try {
    const res = await fetch("/api/bot/save-welcome-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guildId,
        welcomeEnabled: welcomeEnabled.checked,
        channelId: welcomeChannel.value,
        welcomeMessage: welcomeMessage.value
      })
    });

    const data = await res.json();
    if (data.success) {
      showStatus("status-welcome-form", "Configuration sauvegardée ✅", "success");
    } else {
      showStatus("status-welcome-form", "Erreur lors de la sauvegarde ❌", "error");
    }
  } catch (error) {
    showStatus("status-welcome-form", "Erreur de connexion ❌", "error");
  }

  saveWelcome.disabled = false;
  saveWelcome.textContent = "Sauvegarder";
});
