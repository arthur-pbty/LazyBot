const goodbyeForm = document.getElementById("goodbye-form");
const goodbyeEnabled = document.getElementById("goodbye-enabled");
const goodbyeChannel = document.getElementById("goodbye-channel");
const goodbyeMessage = document.getElementById("goodbye-message");
const statusGoodbyeForm = document.getElementById("status-goodbye-form");

fetch(`/api/bot/get-goodbye-config/${guildId}`)
  .then(res => res.json())
  .then(cfg => {
    goodbyeEnabled.checked = cfg.enabled;
    goodbyeChannel.value = cfg.channelId;
    goodbyeMessage.value = cfg.message;
  });

goodbyeForm.addEventListener("submit", async e => {
  e.preventDefault();

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

  statusGoodbyeForm.textContent = (await res.json()).success
    ? "Config au revoir sauvegardée ✅"
    : "Erreur ❌";
});
