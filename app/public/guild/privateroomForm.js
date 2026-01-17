// ===== PRIVATE ROOM FORM =====
(async function () {
  const enabledCheckbox = document.getElementById("privateroom-enabled");
  const creatorChannelSelect = document.getElementById("privateroom-creator-channel");
  const categorySelect = document.getElementById("privateroom-category");
  const nameFormatInput = document.getElementById("privateroom-name-format");
  const saveBtn = document.getElementById("save-privateroom");
  const statusDiv = document.getElementById("status-privateroom-form");

  // Charger les salons vocaux
  async function loadVoiceChannels() {
    try {
      const res = await fetch(`/api/bot/get-voice-channels/${guildId}`);
      const channels = await res.json();
      creatorChannelSelect.innerHTML = '<option value="">-- Sélectionner un salon --</option>';
      channels.forEach(ch => {
        const opt = document.createElement("option");
        opt.value = ch.id;
        opt.textContent = ch.name;
        creatorChannelSelect.appendChild(opt);
      });
    } catch (err) {
      console.error("Erreur chargement salons vocaux:", err);
    }
  }

  // Charger les catégories
  async function loadCategories() {
    try {
      const res = await fetch(`/api/bot/get-categories/${guildId}`);
      const categories = await res.json();
      categorySelect.innerHTML = '<option value="">-- Sélectionner une catégorie --</option>';
      categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.textContent = cat.name;
        categorySelect.appendChild(opt);
      });
    } catch (err) {
      console.error("Erreur chargement catégories:", err);
    }
  }

  // Charger la configuration
  async function loadConfig() {
    try {
      const res = await fetch(`/api/bot/get-privateroom-config/${guildId}`);
      const data = await res.json();
      
      enabledCheckbox.checked = data.enabled;
      nameFormatInput.value = data.channelNameFormat || '🔊 Salon de {user}';
      
      // Attendre que les selects soient remplis
      await Promise.all([loadVoiceChannels(), loadCategories()]);
      
      if (data.creatorChannelId) {
        creatorChannelSelect.value = data.creatorChannelId;
      }
      if (data.categoryId) {
        categorySelect.value = data.categoryId;
      }
    } catch (err) {
      console.error("Erreur chargement config privateroom:", err);
    }
  }

  // Sauvegarder
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = "Sauvegarde...";

    const data = {
      guildId,
      enabled: enabledCheckbox.checked,
      creatorChannelId: creatorChannelSelect.value || null,
      categoryId: categorySelect.value || null,
      channelNameFormat: nameFormatInput.value || '🔊 Salon de {user}'
    };

    try {
      const res = await fetch("/api/bot/save-privateroom-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await res.json();

      if (result.success) {
        showStatus("status-privateroom-form", "Configuration sauvegardée ✅", "success");
      } else {
        showStatus("status-privateroom-form", "Erreur lors de la sauvegarde ❌", "error");
      }
    } catch (err) {
      console.error("Erreur sauvegarde:", err);
      showStatus("status-privateroom-form", "Erreur de connexion ❌", "error");
    }

    saveBtn.disabled = false;
    saveBtn.textContent = "Sauvegarder";
  });

  // Init
  loadConfig();
})();
