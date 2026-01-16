const autoroleNewUserForm = document.getElementById("autorole-newuser-form");
const autoroleEnabled = document.getElementById("autorole-enabled");
const autoroleRole = document.getElementById("autorole-role");
const statusAutoroleForm = document.getElementById("status-autorole-form");

fetch(`/api/bot/get-autorole-newuser-config/${guildId}`)
  .then(res => res.json())
  .then(cfg => {
    autoroleEnabled.checked = cfg.enabled;
    autoroleRole.value = cfg.roleId;
  });

autoroleNewUserForm.addEventListener("submit", async e => {
  e.preventDefault();

  const res = await fetch("/api/bot/save-autorole-newuser-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      guildId,
      enabled: autoroleEnabled.checked,
      roleId: autoroleRole.value
    })
  });

  statusAutoroleForm.textContent = (await res.json()).success
    ? "Auto-rôle sauvegardé ✅"
    : "Erreur ❌";
});
