// ===== COUNTING FORM =====
(async function () {
  const enabledCheckbox = document.getElementById("counting-enabled");
  const channelSelect = document.getElementById("counting-channel");
  const currentCountInput = document.getElementById("counting-current");
  const saveBtn = document.getElementById("save-counting");

  // Charger les salons textuels
  async function loadTextChannels() {
    try {
      const res = await fetch(`/api/bot/get-text-channels/${guildId}`);
      const channels = await res.json();
      channelSelect.innerHTML = '<option value="">-- Sélectionner un salon --</option>';
      channels.forEach(ch => {
        const opt = document.createElement("option");
        opt.value = ch.id;
        opt.textContent = "#" + ch.name;
        channelSelect.appendChild(opt);
      });
    } catch (err) {
      console.error("Erreur chargement salons textuels:", err);
    }
  }

  // Charger la configuration
  async function loadConfig() {
    try {
      await loadTextChannels();
      
      const res = await fetch(`/api/bot/get-counting-config/${guildId}`);
      const data = await res.json();
      
      enabledCheckbox.checked = data.enabled;
      currentCountInput.value = data.currentCount || 0;
      
      if (data.channelId) {
        channelSelect.value = data.channelId;
      }
    } catch (err) {
      console.error("Erreur chargement config counting:", err);
    }
  }

  // Sauvegarder
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = "Sauvegarde...";

    const data = {
      guildId,
      enabled: enabledCheckbox.checked,
      channelId: channelSelect.value || null
    };

    try {
      const res = await fetch("/api/bot/save-counting-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await res.json();

      if (result.success) {
        showStatus("status-counting-form", "Configuration sauvegardée ✅", "success");
      } else {
        showStatus("status-counting-form", "Erreur lors de la sauvegarde ❌", "error");
      }
    } catch (err) {
      console.error("Erreur sauvegarde:", err);
      showStatus("status-counting-form", "Erreur de connexion ❌", "error");
    }

    saveBtn.disabled = false;
    saveBtn.textContent = "Sauvegarder";
  });

  // Init
  loadConfig();
})();
