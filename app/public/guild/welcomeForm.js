const welcomeForm = document.getElementById("welcome-form");
const welcomeEnabled = document.getElementById("welcome-enabled");
const welcomeChannel = document.getElementById("welcome-channel");
const welcomeMessage = document.getElementById("welcome-message");
const statusWelcomeForm = document.getElementById("status-welcome-form");

fetch(`/api/bot/get-welcome-config/${guildId}`)
  .then(res => res.json())
  .then(cfg => {
    welcomeEnabled.checked = cfg.enabled;
    welcomeChannel.value = cfg.channelId;
    welcomeMessage.value = cfg.message;
  });

welcomeForm.addEventListener("submit", async e => {
  e.preventDefault();

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

  statusWelcomeForm.textContent = (await res.json()).success
    ? "Config bienvenue sauvegardée ✅"
    : "Erreur ❌";
});
